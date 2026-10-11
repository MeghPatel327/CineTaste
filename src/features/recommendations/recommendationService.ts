import crypto from "crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getUserMovies, type MovieRow } from "@/features/movies/movieRepository";
import {
  getRecommendationProfile,
  type RecommendationProfileRow,
} from "./recommendationProfileRepository";
import {
  getActiveRecommendationSet,
  createRecommendationSet,
  updateRecommendationSet,
  markUserSetsStale,
  isSetFresh,
  parseRecommendations,
  type RecommendationItem,
  type RecommendationSetRow,
} from "./recommendationSetRepository";
import { generateGeminiCandidates } from "./geminiCandidateGenerator";
import { resolveGeminiCandidates, type ResolvedCandidate } from "./tmdbResolver";
import {
  generateRecommendations as generateTmdbRecommendations,
  type RecommendationExplanation,
} from "./recommendationEngine";

// ─────────────────────────────────────────────────────────────────────────────
// In-flight generation dedup: prevents concurrent Gemini calls for same user
// ─────────────────────────────────────────────────────────────────────────────
const inflightGenerations = new Map<string, Promise<RecommendationItem[]>>();

// ─────────────────────────────────────────────────────────────────────────────
// Taste hash — fingerprint of user state that affects recommendations
// ─────────────────────────────────────────────────────────────────────────────
function computeTasteHash(
  profile: RecommendationProfileRow | null,
  movies: MovieRow[],
): string {
  const parts = [
    profile?.library_hash || "",
    profile?.engine_version || "",
    profile?.favorite_genres?.slice(0, 100) || "",
    profile?.disliked_genres?.slice(0, 100) || "",
    String(movies.filter((m) => m.status === "completed").length),
    String(movies.filter((m) => m.status === "pending").length),
  ];
  return crypto
    .createHash("md5")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 16);
}

// ─────────────────────────────────────────────────────────────────────────────
// Score and rank resolved candidates
// ─────────────────────────────────────────────────────────────────────────────
function scoreResolvedCandidates(
  candidates: ResolvedCandidate[],
  profile: RecommendationProfileRow | null,
): RecommendationItem[] {
  if (!candidates.length) return [];

  // Parse profile for scoring
  let favGenres: Record<string, number> = {};
  let dislikedGenres: Record<string, number> = {};
  let favDirectors: Record<string, number> = {};

  if (profile) {
    try { favGenres = JSON.parse(profile.favorite_genres || "{}"); } catch { /* skip */ }
    try { dislikedGenres = JSON.parse(profile.disliked_genres || "{}"); } catch { /* skip */ }
    try { favDirectors = JSON.parse(profile.favorite_directors || "{}"); } catch { /* skip */ }
  }

  // Normalize genre scores
  const maxGenre = Math.max(...Object.values(favGenres).map(Math.abs), 1);

  const scored = candidates.map((c) => {
    let score = 50; // base score

    // Genre match (+/- up to 25)
    for (const g of c.genres) {
      if (favGenres[g]) score += (favGenres[g] / maxGenre) * 15;
      if (dislikedGenres[g]) score -= 10;
    }

    // TMDB quality signal (+up to 10)
    score += Math.min(c.vote_average * 1.2, 10);

    // Variety bonus for less common genres (+up to 5)
    const uncommon = c.genres.filter((g) => !favGenres[g]);
    if (uncommon.length > 0) score += Math.min(uncommon.length * 2, 5);

    // Clamp to 0-99
    score = Math.max(0, Math.min(99, Math.round(score)));

    const item: RecommendationItem = {
      tmdb_id: c.tmdb_id,
      title: c.title,
      poster_url: c.poster_url,
      backdrop_url: c.backdrop_url,
      media_type: c.media_type,
      genres: c.genres,
      release_year: c.release_year,
      vote_average: c.vote_average,
      overview: c.overview,
      score,
      reasons: buildReasons(c, favGenres, favDirectors),
      gemini_reason: c.gemini_reason,
    };

    return item;
  });

  // Sort by score descending, apply diversity
  scored.sort((a, b) => b.score - a.score);
  return applyDiversity(scored);
}

function buildReasons(
  c: ResolvedCandidate,
  favGenres: Record<string, number>,
  favDirectors: Record<string, number>,
): string[] {
  const reasons: string[] = [];

  // Gemini reason first (the personalized explanation)
  if (c.gemini_reason) reasons.push(c.gemini_reason);

  // Genre match
  const matchedGenres = c.genres.filter((g) => favGenres[g] && favGenres[g] > 0);
  if (matchedGenres.length) {
    reasons.push(`Matches genres you enjoy: ${matchedGenres.slice(0, 2).join(", ")}`);
  }

  // High rating
  if (c.vote_average >= 7.5) {
    reasons.push("Highly rated globally");
  }

  if (!reasons.length) reasons.push("Matches your overall taste");
  return reasons.slice(0, 3);
}

/**
 * Diversity filter — limit genre clusters and ensure variety.
 */
function applyDiversity(items: RecommendationItem[]): RecommendationItem[] {
  const genreCount: Record<string, number> = {};
  const result: RecommendationItem[] = [];
  const deferred: RecommendationItem[] = [];

  for (const item of items) {
    const primaryGenre = item.genres[0] || "__none__";
    const count = genreCount[primaryGenre] || 0;

    if (count >= 5) {
      deferred.push(item);
      continue;
    }

    genreCount[primaryGenre] = count + 1;
    result.push(item);
  }

  return [...result, ...deferred];
}

// ─────────────────────────────────────────────────────────────────────────────
// Full generation pipeline: Gemini → TMDB → Score → Persist
// ─────────────────────────────────────────────────────────────────────────────
async function runGenerationPipeline(
  username: string,
  movies: MovieRow[],
  profile: RecommendationProfileRow | null,
  tasteHash: string,
  previousTitles: string[],
): Promise<RecommendationItem[]> {
  const start = Date.now();
  logger.info({
    module: "recommendationService",
    action: "GENERATION_PIPELINE",
    status: "STARTED",
    message: `Starting Gemini recommendation pipeline for ${username}`,
  });

  const ratedMovies = movies.filter((m) => m.status === "completed" && m.rating > 0);
  const libraryIds = new Set(movies.map((m) => m.tmdb_id));
  const libraryNames = new Set(movies.map((m) => m.movie_name.toLowerCase().trim()));

  // Stage 1: Generate candidates via Gemini
  let geminiCandidates;
  try {
    geminiCandidates = await generateGeminiCandidates({
      username,
      profile,
      ratedMovies,
      allMovies: movies,
      previousRecommendations: previousTitles,
    });
  } catch (err: any) {
    logger.warn({
      module: "recommendationService",
      action: "GEMINI_FALLBACK",
      status: "STARTED",
      message: "Gemini failed, falling back to TMDB-only recommendations",
      error: err,
    });
    // Fallback to existing TMDB-only engine
    return fallbackToTmdb(username, movies, profile, tasteHash);
  }

  if (!geminiCandidates.length) {
    logger.warn({
      module: "recommendationService",
      action: "GEMINI_EMPTY",
      status: "FAILED",
      message: "Gemini returned no candidates, falling back to TMDB-only",
    });
    return fallbackToTmdb(username, movies, profile, tasteHash);
  }

  // Stage 2: Resolve through TMDB
  const resolved = await resolveGeminiCandidates(geminiCandidates, {
    concurrency: 5,
  });

  // Stage 3: Filter out library items and duplicates
  const filtered = resolved.filter((r) => {
    if (libraryIds.has(r.tmdb_id)) return false;
    if (libraryNames.has(r.title.toLowerCase().trim())) return false;
    return true;
  });

  // Stage 4: Score and rank
  let recommendations = scoreResolvedCandidates(filtered, profile);

  // If we got too few from Gemini, supplement with TMDB-only engine
  if (recommendations.length < 10) {
    logger.info({
      module: "recommendationService",
      action: "SUPPLEMENT_TMDB",
      status: "STARTED",
      message: `Only ${recommendations.length} Gemini results, supplementing with TMDB engine`,
    });

    const tmdbRecs = await generateTmdbRecommendations(username, {
      allMovies: movies,
    });
    const geminiIds = new Set(recommendations.map((r) => r.tmdb_id));

    for (const tmdbRec of tmdbRecs) {
      if (geminiIds.has(tmdbRec.movieId)) continue;
      if (libraryIds.has(tmdbRec.movieId)) continue;

      recommendations.push({
        tmdb_id: tmdbRec.movieId,
        title: tmdbRec.title,
        poster_url: tmdbRec.poster_url,
        backdrop_url: null,
        media_type: tmdbRec.media_type || "movie",
        genres: tmdbRec.genres || [],
        release_year: tmdbRec.release_year || 0,
        vote_average: tmdbRec.vote_average || 0,
        overview: "",
        score: tmdbRec.score,
        reasons: tmdbRec.reasons,
        gemini_reason: "",
      });

      if (recommendations.length >= 30) break;
    }
  }

  // Stage 5: Persist
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + env.RECOMMENDATION_FRESHNESS_HOURS * 60 * 60 * 1000,
  );

  try {
    // Mark any existing active sets as stale
    await markUserSetsStale(username);

    await createRecommendationSet({
      username,
      recommendations: JSON.stringify(recommendations),
      status: "active",
      taste_hash: tasteHash,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      generation_model: env.GEMINI_MODEL,
      item_count: recommendations.length,
    });

    logger.info({
      module: "recommendationService",
      action: "GENERATION_PIPELINE",
      status: "SUCCESS",
      durationMs: Date.now() - start,
      message: `Persisted ${recommendations.length} recommendations for ${username}`,
    });
  } catch (err: any) {
    logger.error({
      module: "recommendationService",
      action: "PERSIST_SET",
      status: "FAILED",
      error: err,
      message: "Failed to persist recommendation set, returning in-memory results",
    });
    // Still return the recommendations even if persistence failed
  }

  return recommendations;
}

/**
 * Fallback: convert TMDB-only engine results to RecommendationItem format and persist.
 */
async function fallbackToTmdb(
  username: string,
  movies: MovieRow[],
  profile: RecommendationProfileRow | null,
  tasteHash: string,
): Promise<RecommendationItem[]> {
  const tmdbRecs = await generateTmdbRecommendations(username, {
    allMovies: movies,
  });

  const recommendations: RecommendationItem[] = tmdbRecs.slice(0, 30).map((r) => ({
    tmdb_id: r.movieId,
    title: r.title,
    poster_url: r.poster_url,
    backdrop_url: null,
    media_type: r.media_type || "movie",
    genres: r.genres || [],
    release_year: r.release_year || 0,
    vote_average: r.vote_average || 0,
    overview: "",
    score: r.score,
    reasons: r.reasons,
    gemini_reason: "",
  }));

  // Persist fallback results too
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + env.RECOMMENDATION_FRESHNESS_HOURS * 60 * 60 * 1000,
  );

  try {
    await markUserSetsStale(username);
    await createRecommendationSet({
      username,
      recommendations: JSON.stringify(recommendations),
      status: "active",
      taste_hash: tasteHash,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      generation_model: "tmdb-fallback",
      item_count: recommendations.length,
    });
  } catch (err: any) {
    logger.error({
      module: "recommendationService",
      action: "PERSIST_FALLBACK",
      status: "FAILED",
      error: err,
      message: "Failed to persist fallback recommendation set",
    });
  }

  return recommendations;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface GetRecommendationsOptions {
  offset?: number;
  limit?: number;
  forceRefresh?: boolean;
}

/**
 * Get recommendations for a user using the hybrid lifecycle:
 * 1. Check for fresh persisted set → return if valid
 * 2. Generate new set via Gemini + TMDB → persist and return
 * 3. Revalidate watched/excluded items before serving
 */
export async function getRecommendations(
  username: string,
  options?: GetRecommendationsOptions,
): Promise<RecommendationItem[]> {
  const start = Date.now();
  const forceRefresh = options?.forceRefresh ?? false;

  logger.info({
    module: "recommendationService",
    action: "GET_RECOMMENDATIONS",
    status: "STARTED",
    message: `Getting recommendations for ${username} (force=${forceRefresh})`,
  });

  // Load user context
  const [movies, profile] = await Promise.all([
    getUserMovies(username),
    getRecommendationProfile(username),
  ]);

  const tasteHash = computeTasteHash(profile, movies);

  // Check for persisted set (unless forcing refresh)
  if (!forceRefresh && env.BASEROW_RECOMMENDATION_SETS_TABLE_ID) {
    const existingSet = await getActiveRecommendationSet(username);

    if (existingSet && isSetFresh(existingSet, tasteHash)) {
      logger.info({
        module: "recommendationService",
        action: "GET_RECOMMENDATIONS",
        status: "SUCCESS",
        durationMs: Date.now() - start,
        message: `Serving ${existingSet.item_count} persisted recommendations (cached)`,
      });

      // Revalidate: filter out newly watched/excluded items
      const items = revalidateItems(
        parseRecommendations(existingSet),
        movies,
      );

      return applyPagination(items, options);
    }

    // Set exists but is stale or taste changed — need regeneration
    if (existingSet && !isSetFresh(existingSet, tasteHash)) {
      logger.info({
        module: "recommendationService",
        action: "SET_STALE",
        status: "STARTED",
        message: `Existing set is stale (hash mismatch or expired), regenerating`,
      });
    }
  }

  // Dedup concurrent generation requests
  const inflightKey = `${username}:${tasteHash}`;
  if (inflightGenerations.has(inflightKey)) {
    logger.info({
      module: "recommendationService",
      action: "DEDUP_INFLIGHT",
      status: "SUCCESS",
      message: "Joining existing in-flight generation",
    });
    const result = await inflightGenerations.get(inflightKey)!;
    return applyPagination(revalidateItems(result, movies), options);
  }

  // Get previous recommendation titles for diversity
  let previousTitles: string[] = [];
  if (env.BASEROW_RECOMMENDATION_SETS_TABLE_ID) {
    const prevSet = await getActiveRecommendationSet(username);
    if (prevSet) {
      previousTitles = parseRecommendations(prevSet).map((r) => r.title);
    }
  }

  // Generate new recommendations
  const generationPromise = runGenerationPipeline(
    username,
    movies,
    profile,
    tasteHash,
    previousTitles,
  ).finally(() => {
    inflightGenerations.delete(inflightKey);
  });

  inflightGenerations.set(inflightKey, generationPromise);

  const items = await generationPromise;

  logger.info({
    module: "recommendationService",
    action: "GET_RECOMMENDATIONS",
    status: "SUCCESS",
    durationMs: Date.now() - start,
    message: `Generated and persisted ${items.length} fresh recommendations`,
  });

  return applyPagination(revalidateItems(items, movies), options);
}

/**
 * Revalidate persisted items against current user state.
 * Removes watched, excluded items.
 */
function revalidateItems(
  items: RecommendationItem[],
  movies: MovieRow[],
): RecommendationItem[] {
  const watchedIds = new Set(
    movies
      .filter((m) => m.status === "completed")
      .map((m) => m.tmdb_id),
  );
  const libraryIds = new Set(movies.map((m) => m.tmdb_id));

  return items.filter((item) => !libraryIds.has(item.tmdb_id));
}

function applyPagination(
  items: RecommendationItem[],
  options?: GetRecommendationsOptions,
): RecommendationItem[] {
  if (options?.offset !== undefined && options.limit) {
    return items.slice(options.offset, options.offset + options.limit);
  }
  return items;
}

/**
 * Invalidate recommendations for a user (mark as stale).
 * Called when meaningful taste changes occur.
 */
export async function invalidateRecommendations(
  username: string,
): Promise<void> {
  if (!env.BASEROW_RECOMMENDATION_SETS_TABLE_ID) return;

  try {
    await markUserSetsStale(username);
    logger.info({
      module: "recommendationService",
      action: "INVALIDATE",
      status: "SUCCESS",
      message: `Invalidated recommendations for ${username}`,
    });
  } catch (err: any) {
    logger.error({
      module: "recommendationService",
      action: "INVALIDATE",
      status: "FAILED",
      error: err,
      message: `Failed to invalidate recommendations for ${username}`,
    });
  }
}

export function toLegacyFormat(items: RecommendationItem[]): (RecommendationExplanation & {
  id: number;
  gemini_reason?: string;
  overview?: string;
  backdrop_url?: string | null;
})[] {
  return items.map((item) => ({
    id: item.tmdb_id,
    movieId: item.tmdb_id,
    title: item.title,
    poster_url: item.poster_url,
    score: item.score,
    reasons: item.reasons,
    media_type: item.media_type,
    genres: item.genres,
    release_year: item.release_year,
    vote_average: item.vote_average,
    overview: item.overview,
    backdrop_url: item.backdrop_url,
    gemini_reason: item.gemini_reason,
  }));
}

