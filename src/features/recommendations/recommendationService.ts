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
import { isAnime } from "@/features/movies/animeClassifier";
import { itemMatchesAllGenres, getTmdbGenreIds, TMDB_GENRES as TMDB_GENRE_MAP } from "@/features/movies/browseFiltering";

// ─────────────────────────────────────────────────────────────────────────────
// In-flight generation dedup: prevents concurrent calls for same user
// ─────────────────────────────────────────────────────────────────────────────
const inflightGenerations = new Map<string, Promise<RecommendationItem[]>>();

// In-memory hot cache for recommendation sets (resets on server redeploy)
interface HotRecCache {
  items: RecommendationItem[];
  tasteHash: string;
  expiresAt: number;
}
const serverRecMemoryCache = new Map<string, HotRecCache>();

// TMDB constants & genre mapping
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const GENRE_NAME_TO_TMDB_ID: Record<string, number> = {
  "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35, "Crime": 80,
  "Documentary": 99, "Drama": 18, "Family": 10751, "Fantasy": 14, "History": 36,
  "Horror": 27, "Music": 10402, "Mystery": 9648, "Romance": 10749, "Science Fiction": 878,
  "Thriller": 53, "War": 10752, "Western": 37,
};

async function tmdbFetch(path: string): Promise<any> {
  if (!env.TMDB_API_KEY) return null;
  const sep = path.includes("?") ? "&" : "?";
  try {
    const res = await fetch(`${TMDB_BASE_URL}${path}${sep}api_key=${env.TMDB_API_KEY}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

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

  let favGenres: Record<string, number> = {};
  let dislikedGenres: Record<string, number> = {};
  let favDirectors: Record<string, number> = {};

  if (profile) {
    try { favGenres = JSON.parse(profile.favorite_genres || "{}"); } catch { /* skip */ }
    try { dislikedGenres = JSON.parse(profile.disliked_genres || "{}"); } catch { /* skip */ }
    try { favDirectors = JSON.parse(profile.favorite_directors || "{}"); } catch { /* skip */ }
  }

  const maxGenre = Math.max(...Object.values(favGenres).map(Math.abs), 1);

  const scored = candidates.map((c) => {
    let score = 50; // base score

    // Genre match
    for (const g of c.genres) {
      if (favGenres[g]) score += (favGenres[g] / maxGenre) * 15;
      if (dislikedGenres[g]) score -= 10;
    }

    // TMDB quality signal
    score += Math.min(c.vote_average * 1.2, 10);

    // Variety bonus
    const uncommon = c.genres.filter((g) => !favGenres[g]);
    if (uncommon.length > 0) score += Math.min(uncommon.length * 2, 5);

    score = Math.max(10, Math.min(99, Math.round(score)));

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
      is_anime: c.is_anime,
    };

    return item;
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function buildReasons(
  c: ResolvedCandidate,
  favGenres: Record<string, number>,
  favDirectors: Record<string, number>,
): string[] {
  const reasons: string[] = [];

  if (c.gemini_reason) reasons.push(c.gemini_reason);

  const matchedGenres = c.genres.filter((g) => favGenres[g] && favGenres[g] > 0);
  if (matchedGenres.length) {
    reasons.push(`Matches genres you enjoy: ${matchedGenres.slice(0, 2).join(", ")}`);
  }

  if (c.vote_average >= 7.5) {
    reasons.push("Highly rated globally");
  }

  if (!reasons.length) reasons.push("Matches your overall taste");
  return reasons.slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// TMDB Supplementation: ensures each category reaches at least 100 titles
// ─────────────────────────────────────────────────────────────────────────────
async function fetchTmdbSupplement(
  category: "movies" | "series" | "anime",
  neededCount: number,
  excludeIds: Set<number>,
  ratedMovies: MovieRow[],
): Promise<ResolvedCandidate[]> {
  const results: ResolvedCandidate[] = [];
  const seenIds = new Set<number>(excludeIds);

  const add = (items: any[], forceType?: "movie" | "tv") => {
    for (const r of items || []) {
      if (!r?.id || seenIds.has(r.id)) continue;

      const mediaType: "movie" | "tv" =
        forceType || (r.media_type === "tv" || r.first_air_date ? "tv" : "movie");

      const isAnimeTitle = isAnime({
        id: r.id,
        media_type: mediaType,
        title: r.title || r.name,
        genre_ids: r.genre_ids,
        original_language: r.original_language,
        origin_country: r.origin_country,
        overview: r.overview,
      });

      // Strict mutual exclusivity
      if (category === "movies" && (isAnimeTitle || mediaType !== "movie")) continue;
      if (category === "series" && (isAnimeTitle || mediaType !== "tv")) continue;
      if (category === "anime" && !isAnimeTitle) continue;

      seenIds.add(r.id);

      const releaseDate = r.release_date || r.first_air_date || "";
      const releaseYear = parseInt(releaseDate.split("-")[0], 10) || 0;
      const genres = (r.genre_ids || [])
        .map((id: number) => TMDB_GENRE_MAP[id])
        .filter(Boolean);

      results.push({
        tmdb_id: r.id,
        title: r.title || r.name || "Untitled",
        poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        backdrop_url: r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : null,
        media_type: mediaType,
        genres,
        release_year: releaseYear,
        vote_average: r.vote_average ? parseFloat(Number(r.vote_average).toFixed(1)) : 0,
        overview: r.overview || "",
        gemini_reason: "Acclaimed title tailored to your profile",
        is_anime: isAnimeTitle,
      });

      if (results.length >= neededCount) break;
    }
  };

  if (category === "movies") {
    // 1. Similar/recommendations for user's favorite rated movies
    const favMovies = ratedMovies.filter((m) => m.rating >= 8 && m.type !== "series");
    for (const fav of favMovies.slice(0, 6)) {
      if (results.length >= neededCount) break;
      const recs = await tmdbFetch(`/movie/${fav.tmdb_id}/recommendations`);
      add(recs?.results, "movie");
    }
    // 2. High quality TMDB feeds
    for (let page = 1; page <= 6 && results.length < neededCount; page++) {
      const [topRated, popular] = await Promise.all([
        tmdbFetch(`/movie/top_rated?page=${page}`),
        tmdbFetch(`/movie/popular?page=${page}`),
      ]);
      add(topRated?.results, "movie");
      add(popular?.results, "movie");
    }
  } else if (category === "series") {
    // 1. Similar/recommendations for user's favorite rated series
    const favSeries = ratedMovies.filter((m) => m.rating >= 8 && m.type === "series");
    for (const fav of favSeries.slice(0, 6)) {
      if (results.length >= neededCount) break;
      const recs = await tmdbFetch(`/tv/${fav.tmdb_id}/recommendations`);
      add(recs?.results, "tv");
    }
    // 2. High quality TMDB TV feeds
    for (let page = 1; page <= 6 && results.length < neededCount; page++) {
      const [topRated, popular] = await Promise.all([
        tmdbFetch(`/tv/top_rated?page=${page}`),
        tmdbFetch(`/tv/popular?page=${page}`),
      ]);
      add(topRated?.results, "tv");
      add(popular?.results, "tv");
    }
  } else if (category === "anime") {
    // Japanese animation (series & movies)
    for (let page = 1; page <= 6 && results.length < neededCount; page++) {
      const [tvTop, movieTop, tvPop, moviePop] = await Promise.all([
        tmdbFetch(`/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=80&page=${page}`),
        tmdbFetch(`/discover/movie?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=80&page=${page}`),
        tmdbFetch(`/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`),
        tmdbFetch(`/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`),
      ]);
      add(tvTop?.results, "tv");
      add(movieTop?.results, "movie");
      add(tvPop?.results, "tv");
      add(moviePop?.results, "movie");
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Pool Generation: Generates at least 100 unique items for a category
// ─────────────────────────────────────────────────────────────────────────────
async function generateCategoryPool(
  username: string,
  category: "movies" | "series" | "anime",
  movies: MovieRow[],
  profile: RecommendationProfileRow | null,
  previousTitles: string[],
  seenAcrossCategories: Set<number>,
): Promise<RecommendationItem[]> {
  const ratedMovies = movies.filter((m) => m.status === "completed" && m.rating > 0);
  const libraryIds = new Set(movies.map((m) => m.tmdb_id));
  const libraryNames = new Set(movies.map((m) => m.movie_name.toLowerCase().trim()));

  const TARGET_PER_CATEGORY = 100;
  const resolvedMap = new Map<number, ResolvedCandidate>();

  // 1. Try Gemini generation for this category
  try {
    const geminiCandidates = await generateGeminiCandidates(
      {
        username,
        profile,
        ratedMovies,
        allMovies: movies,
        previousRecommendations: previousTitles,
      },
      {
        category,
        targetCount: 85,
      },
    );

    if (geminiCandidates.length) {
      const resolved = await resolveGeminiCandidates(geminiCandidates, { concurrency: 5 });
      for (const r of resolved) {
        if (!r?.tmdb_id) continue;
        if (libraryIds.has(r.tmdb_id) || seenAcrossCategories.has(r.tmdb_id)) continue;
        if (libraryNames.has(r.title.toLowerCase().trim())) continue;

        // Verify mutual exclusivity
        if (category === "movies" && (r.is_anime || r.media_type !== "movie")) continue;
        if (category === "series" && (r.is_anime || r.media_type !== "tv")) continue;
        if (category === "anime" && !r.is_anime) continue;

        resolvedMap.set(r.tmdb_id, r);
        seenAcrossCategories.add(r.tmdb_id);
      }
    }
  } catch (err) {
    logger.warn({
      module: "recommendationService",
      action: "CATEGORY_GEMINI_FALLBACK",
      category,
      error: err,
      message: `Gemini failed for ${category}, relying on TMDB supplement`,
    });
  }

  // 2. Supplement from TMDB if under 100
  if (resolvedMap.size < TARGET_PER_CATEGORY) {
    const needed = TARGET_PER_CATEGORY - resolvedMap.size;
    const combinedExclude = new Set<number>([
      ...Array.from(libraryIds),
      ...Array.from(seenAcrossCategories),
    ]);

    const supplements = await fetchTmdbSupplement(category, needed, combinedExclude, ratedMovies);
    for (const sup of supplements) {
      if (resolvedMap.size >= TARGET_PER_CATEGORY) break;
      if (!resolvedMap.has(sup.tmdb_id) && !libraryIds.has(sup.tmdb_id)) {
        resolvedMap.set(sup.tmdb_id, sup);
        seenAcrossCategories.add(sup.tmdb_id);
      }
    }
  }

  // 3. Score candidates with user profile
  const scored = scoreResolvedCandidates(Array.from(resolvedMap.values()), profile);
  return scored;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full generation pipeline: at least 100 Movies + 100 Series + 100 Anime = 300
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
    message: `Starting 300-title recommendation pipeline for ${username}`,
  });

  const seenAcrossCategories = new Set<number>();

  // Generate 100+ Movies, 100+ Series, 100+ Anime in parallel
  const [moviesPool, seriesPool, animePool] = await Promise.all([
    generateCategoryPool(username, "movies", movies, profile, previousTitles, seenAcrossCategories),
    generateCategoryPool(username, "series", movies, profile, previousTitles, seenAcrossCategories),
    generateCategoryPool(username, "anime", movies, profile, previousTitles, seenAcrossCategories),
  ]);

  // Interleave round-robin targeting ~1/3 each (Movie, Series, Anime)
  const recommendations: RecommendationItem[] = [];
  const maxPoolLen = Math.max(moviesPool.length, seriesPool.length, animePool.length);
  for (let i = 0; i < maxPoolLen; i++) {
    if (i < moviesPool.length) recommendations.push(moviesPool[i]);
    if (i < seriesPool.length) recommendations.push(seriesPool[i]);
    if (i < animePool.length) recommendations.push(animePool[i]);
  }

  logger.info({
    module: "recommendationService",
    action: "GENERATION_PIPELINE",
    status: "SUCCESS",
    moviesCount: moviesPool.length,
    seriesCount: seriesPool.length,
    animeCount: animePool.length,
    totalCount: recommendations.length,
    durationMs: Date.now() - start,
  });

  // Persist to Baserow
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
      generation_model: `${env.GEMINI_MODEL}+tmdb-hybrid-300`,
      item_count: recommendations.length,
    });

    logger.info({
      module: "recommendationService",
      action: "PERSIST_SET",
      status: "SUCCESS",
      message: `Persisted ${recommendations.length} recommendations for ${username}`,
    });
  } catch (err: any) {
    logger.error({
      module: "recommendationService",
      action: "PERSIST_SET",
      status: "FAILED",
      error: err,
      message: "Failed to persist recommendation set to Baserow, keeping in-memory",
    });
  }

  // Update in-memory hot cache
  serverRecMemoryCache.set(username, {
    items: recommendations,
    tasteHash,
    expiresAt: expiresAt.getTime(),
  });

  return recommendations;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter-Targeted Recommendation Expansion (< 10 suitable titles)
// ─────────────────────────────────────────────────────────────────────────────
const userExpansionCache = new Map<string, number>();

export async function expandRecommendationsForFilter(
  username: string,
  category: "movies" | "series" | "anime",
  filters: { genres?: string[]; era?: string },
  currentSet: RecommendationItem[],
): Promise<RecommendationItem[]> {
  const filterKey = `${username}:${category}:${(filters.genres || []).sort().join(",")}:${filters.era || ""}`;
  const now = Date.now();

  // Rate limit expansion per filter combination to 15 minutes
  if (userExpansionCache.has(filterKey) && now - userExpansionCache.get(filterKey)! < 15 * 60 * 1000) {
    return currentSet;
  }
  userExpansionCache.set(filterKey, now);

  logger.info({
    module: "recommendationService",
    action: "FILTER_EXPANSION",
    category,
    filters,
    username,
    status: "STARTED",
  });

  const [movies, profile] = await Promise.all([
    getUserMovies(username),
    getRecommendationProfile(username),
  ]);

  const existingIds = new Set(currentSet.map((r) => r.tmdb_id));
  const libraryIds = new Set(movies.map((m) => m.tmdb_id));
  const newCandidates: ResolvedCandidate[] = [];

  const filterPrompt = [
    filters.genres?.length ? `Genres: ${filters.genres.join(", ")}` : "",
    filters.era ? `Era / Decade: ${filters.era}` : "",
  ].filter(Boolean).join(". ");

  // 1. Try prompt-adjusted Gemini candidate generation
  try {
    const geminiCandidates = await generateGeminiCandidates(
      {
        username,
        profile,
        ratedMovies: movies.filter((m) => m.status === "completed" && m.rating > 0),
        allMovies: movies,
      },
      {
        category,
        targetCount: 25,
        filterPrompt,
      },
    );

    if (geminiCandidates.length) {
      const resolved = await resolveGeminiCandidates(geminiCandidates, { concurrency: 5 });
      for (const r of resolved) {
        if (!r?.tmdb_id || existingIds.has(r.tmdb_id) || libraryIds.has(r.tmdb_id)) continue;
        if (category === "movies" && (r.is_anime || r.media_type !== "movie")) continue;
        if (category === "series" && (r.is_anime || r.media_type !== "tv")) continue;
        if (category === "anime" && !r.is_anime) continue;

        // Strict multi-genre matching: must match ALL specified genres
        if (filters.genres?.length) {
          const matchesAll = itemMatchesAllGenres(r.genres, filters.genres);
          if (!matchesAll) continue;
        }

        newCandidates.push(r);
        existingIds.add(r.tmdb_id);
      }
    }
  } catch (err) {
    logger.warn({
      module: "recommendationService",
      action: "FILTER_EXPANSION_GEMINI",
      error: err,
    });
  }

  // 2. Supplement from TMDB discover for these filters if still needed
  if (newCandidates.length < 15 && filters.genres?.length) {
    const movieGenreIds = getTmdbGenreIds("movies", filters.genres).join(",");
    const tvGenreIds = getTmdbGenreIds("series", filters.genres).join(",");
    const animeTvGenreIds = getTmdbGenreIds("anime", filters.genres, "tv").join(",");
    const animeMovieGenreIds = getTmdbGenreIds("anime", filters.genres, "movie").join(",");

    let eraParam = "";
    if (filters.era === "2020s") eraParam = "&primary_release_date.gte=2020-01-01&first_air_date.gte=2020-01-01";
    else if (filters.era === "2010s") eraParam = "&primary_release_date.gte=2010-01-01&primary_release_date.lte=2019-12-31";
    else if (filters.era === "2000s") eraParam = "&primary_release_date.gte=2000-01-01&primary_release_date.lte=2009-12-31";
    else if (filters.era === "1990s") eraParam = "&primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31";
    else if (filters.era === "Classic") eraParam = "&primary_release_date.lte=1989-12-31";

    const endpoints: string[] = [];
    if (category === "movies") {
      endpoints.push(`/discover/movie?with_genres=${movieGenreIds}${eraParam}&sort_by=vote_average.desc&vote_count.gte=100&page=1`);
    } else if (category === "series") {
      endpoints.push(`/discover/tv?with_genres=${tvGenreIds}${eraParam}&sort_by=vote_average.desc&vote_count.gte=80&page=1`);
    } else if (category === "anime") {
      endpoints.push(`/discover/tv?with_genres=16${animeTvGenreIds ? `,${animeTvGenreIds}` : ""}&with_original_language=ja${eraParam}&sort_by=vote_average.desc&vote_count.gte=50&page=1`);
      endpoints.push(`/discover/movie?with_genres=16${animeMovieGenreIds ? `,${animeMovieGenreIds}` : ""}&with_original_language=ja${eraParam}&sort_by=vote_average.desc&vote_count.gte=50&page=1`);
    }

    for (const ep of endpoints) {
      const data = await tmdbFetch(ep);
      for (const item of data?.results || []) {
        if (!item?.id || existingIds.has(item.id) || libraryIds.has(item.id)) continue;
        const mediaType = item.media_type === "tv" || item.first_air_date ? "tv" : "movie";
        const isAnimeTitle = isAnime({
          id: item.id,
          media_type: mediaType,
          title: item.title || item.name,
          genre_ids: item.genre_ids,
          original_language: item.original_language,
          origin_country: item.origin_country,
        });

        if (category === "movies" && (isAnimeTitle || mediaType !== "movie")) continue;
        if (category === "series" && (isAnimeTitle || mediaType !== "tv")) continue;
        if (category === "anime" && !isAnimeTitle) continue;

        const releaseDate = item.release_date || item.first_air_date || "";
        const genres: string[] = (item.genre_ids || []).map((id: number) => TMDB_GENRE_MAP[id]).filter(Boolean);

        // Strict multi-genre matching: must match ALL specified genres
        if (filters.genres?.length) {
          const matchesAll = itemMatchesAllGenres(genres, filters.genres);
          if (!matchesAll) continue;
        }

        existingIds.add(item.id);

        newCandidates.push({
          tmdb_id: item.id,
          title: item.title || item.name || "Untitled",
          poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          backdrop_url: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null,
          media_type: mediaType,
          genres,
          release_year: parseInt(releaseDate.split("-")[0], 10) || 0,
          vote_average: item.vote_average ? parseFloat(Number(item.vote_average).toFixed(1)) : 0,
          overview: item.overview || "",
          gemini_reason: `Discovered for filters: ${filterPrompt}`,
          is_anime: isAnimeTitle,
        });
      }
    }
  }

  if (!newCandidates.length) return currentSet;

  const scoredNew = scoreResolvedCandidates(newCandidates, profile);
  const updatedSet = [...currentSet, ...scoredNew];

  // Update in-memory and database
  const cached = serverRecMemoryCache.get(username);
  if (cached) {
    cached.items = updatedSet;
  }

  if (env.BASEROW_RECOMMENDATION_SETS_TABLE_ID) {
    getActiveRecommendationSet(username).then((activeRow) => {
      if (activeRow?.id) {
        updateRecommendationSet(activeRow.id, {
          recommendations: JSON.stringify(updatedSet),
          item_count: updatedSet.length,
        }).catch(() => {});
      }
    });
  }

  logger.info({
    module: "recommendationService",
    action: "FILTER_EXPANSION",
    status: "SUCCESS",
    addedCount: scoredNew.length,
    newTotal: updatedSet.length,
  });

  return updatedSet;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface GetRecommendationsOptions {
  offset?: number;
  limit?: number;
  forceRefresh?: boolean;
  /** Return [] instead of triggering generation when no cache/persisted set exists */
  skipGeneration?: boolean;
}

/**
 * Get recommendations for a user:
 * 1. Check in-memory server cache
 * 2. Check fresh persisted set in database
 * 3. Generate new 300-title set (100 movies, 100 series, 100 anime)
 * 4. Filter out newly added library titles before serving
 */
export async function getRecommendations(
  username: string,
  options?: GetRecommendationsOptions,
): Promise<RecommendationItem[]> {
  const start = Date.now();
  const forceRefresh = options?.forceRefresh ?? false;

  const [movies, profile] = await Promise.all([
    getUserMovies(username),
    getRecommendationProfile(username),
  ]);

  const tasteHash = computeTasteHash(profile, movies);

  // 1. Check in-memory cache
  if (!forceRefresh) {
    const mem = serverRecMemoryCache.get(username);
    if (mem && mem.tasteHash === tasteHash && mem.expiresAt > Date.now()) {
      const items = balanceRecommendations(revalidateItems(mem.items, movies));
      return applyPagination(items, options);
    }
  }

  // 2. Check database set
  if (!forceRefresh && env.BASEROW_RECOMMENDATION_SETS_TABLE_ID) {
    const existingSet = await getActiveRecommendationSet(username);

    if (existingSet && isSetFresh(existingSet, tasteHash)) {
      const raw = parseRecommendations(existingSet);
      if (raw.length > 0) {
        serverRecMemoryCache.set(username, {
          items: raw,
          tasteHash,
          expiresAt: new Date(existingSet.expires_at).getTime(),
        });

        const items = balanceRecommendations(revalidateItems(raw, movies));
        return applyPagination(items, options);
      }
    }
  }

  // 3. Deduplicate concurrent generation requests
  if (options?.skipGeneration) {
    // Trigger generation in background for next request, return empty now
    const bgKey = `${username}:${tasteHash}`;
    if (!inflightGenerations.has(bgKey)) {
      let previousTitles: string[] = [];
      if (env.BASEROW_RECOMMENDATION_SETS_TABLE_ID) {
        const prevSet = await getActiveRecommendationSet(username);
        if (prevSet) previousTitles = parseRecommendations(prevSet).map((r) => r.title);
      }
      const bgPromise = runGenerationPipeline(username, movies, profile, tasteHash, previousTitles)
        .finally(() => { inflightGenerations.delete(bgKey); });
      inflightGenerations.set(bgKey, bgPromise);
    }
    return [];
  }

  const inflightKey = `${username}:${tasteHash}`;
  if (inflightGenerations.has(inflightKey)) {
    const result = await inflightGenerations.get(inflightKey)!;
    return applyPagination(balanceRecommendations(revalidateItems(result, movies)), options);
  }

  // 4. Generate fresh 300-title recommendation set
  let previousTitles: string[] = [];
  if (env.BASEROW_RECOMMENDATION_SETS_TABLE_ID) {
    const prevSet = await getActiveRecommendationSet(username);
    if (prevSet) previousTitles = parseRecommendations(prevSet).map((r) => r.title);
  }

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

  return applyPagination(balanceRecommendations(revalidateItems(items, movies)), options);
}

/**
 * Mix Movies, Series, and Anime targeting approximately one-third of each category,
 * ensuring high variety without any one category dominating.
 */
export function balanceRecommendations(items: RecommendationItem[]): RecommendationItem[] {
  const movies: RecommendationItem[] = [];
  const series: RecommendationItem[] = [];
  const anime: RecommendationItem[] = [];

  for (const item of items) {
    const isAnimeTitle = Boolean(
      item.is_anime ??
        isAnime({
          title: item.title,
          genres: item.genres,
          media_type: item.media_type,
        })
    );

    if (isAnimeTitle) {
      anime.push(item);
    } else if (item.media_type === "tv") {
      series.push(item);
    } else {
      movies.push(item);
    }
  }

  // Round-robin interleave to achieve 1/3 Movies, 1/3 Series, 1/3 Anime
  const result: RecommendationItem[] = [];
  const maxLen = Math.max(movies.length, series.length, anime.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < movies.length) result.push(movies[i]);
    if (i < series.length) result.push(series[i]);
    if (i < anime.length) result.push(anime[i]);
  }
  return result;
}

function revalidateItems(
  items: RecommendationItem[],
  movies: MovieRow[],
): RecommendationItem[] {
  const libraryIds = new Set(movies.map((m) => m.tmdb_id));
  const libraryNames = new Set(movies.map((m) => m.movie_name.toLowerCase().trim()));

  return items.filter((item) => {
    if (libraryIds.has(item.tmdb_id)) return false;
    if (libraryNames.has(item.title.toLowerCase().trim())) return false;
    return true;
  });
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

export async function invalidateRecommendations(username: string): Promise<void> {
  serverRecMemoryCache.delete(username);
  if (!env.BASEROW_RECOMMENDATION_SETS_TABLE_ID) return;
  try {
    await markUserSetsStale(username);
  } catch (err: any) {
    logger.error({
      module: "recommendationService",
      action: "INVALIDATE",
      status: "FAILED",
      error: err,
    });
  }
}

export function toLegacyFormat(items: RecommendationItem[]): (RecommendationExplanation & {
  id: number;
  gemini_reason?: string;
  overview?: string;
  backdrop_url?: string | null;
  is_anime?: boolean;
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
    is_anime: item.is_anime,
  }));
}
