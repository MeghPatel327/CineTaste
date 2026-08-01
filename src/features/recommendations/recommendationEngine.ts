import { MovieRow, getUserMovies } from "@/features/movies/movieRepository";
import { getRecommendationProfile, RecommendationProfileRow } from "./recommendationProfileRepository";
import { env } from "@/lib/env";
import { getFilmIndustry } from "@/lib/utils";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────
export interface RecommendationExplanation {
  movieId: number;
  title: string;
  poster_url: string | null;
  score: number;
  reasons: string[];
  media_type?: "movie" | "tv";
  genres?: string[];
  release_year?: number;
  vote_average?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const TMDB = "https://api.themoviedb.org/3";

const RATING_WEIGHTS: Record<number, number> = {
  10: 2.0, 9: 1.5, 8: 1.0, 7: 0.5, 6: 0.0,
  5: -0.25, 4: -0.5, 3: -1.0, 2: -1.5, 1: -2.0,
};

const SCORE_WEIGHTS = {
  genre:    0.40,
  keyword:  0.15,
  director: 0.10,
  industry: 0.08,
  actor:    0.07,
  company:  0.05,
  era:      0.05,
  language: 0.03,
  dislike:  0.03,  // penalty weight
  tmdb:     0.04,
};

const TMDB_GENRES: Record<number, string> = {
  28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",
  99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",
  27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Science Fiction",
  10770:"TV Movie",53:"Thriller",10752:"War",37:"Western",
  10759:"Action & Adventure",10762:"Kids",10765:"Sci-Fi & Fantasy",
};

// ─────────────────────────────────────────────────────────────────────────────
// In-process TMDB cache (per server instance, resets on redeploy)
// ─────────────────────────────────────────────────────────────────────────────
const tmdbMetaCache = new Map<string, any>();

// ─────────────────────────────────────────────────────────────────────────────
// Parsed user preference profile (loaded from DB, never rebuilt at runtime)
// ─────────────────────────────────────────────────────────────────────────────
interface UserPreferences {
  favoriteGenres:      Record<string, number>;
  dislikedGenres:      Record<string, number>;
  favoriteActors:      Record<string, number>;
  favoriteDirectors:   Record<string, number>;
  favoriteCompanies:   Record<string, number>;
  favoriteIndustries:  Record<string, number>;
  favoriteEras:        Record<string, number>;
  languagePreferences: Record<string, number>;
}

function emptyPreferences(): UserPreferences {
  return {
    favoriteGenres: {}, dislikedGenres: {},
    favoriteActors: {}, favoriteDirectors: {},
    favoriteCompanies: {}, favoriteIndustries: {},
    favoriteEras: {}, languagePreferences: {},
  };
}

function parsePreferences(row: RecommendationProfileRow): UserPreferences {
  const p = emptyPreferences();
  try { p.favoriteGenres      = JSON.parse(row.favorite_genres || "{}");      } catch { /* keep empty */ }
  try { p.dislikedGenres      = JSON.parse(row.disliked_genres || "{}");      } catch { /* keep empty */ }
  try { p.favoriteActors      = JSON.parse(row.favorite_actors || "{}");      } catch { /* keep empty */ }
  try { p.favoriteDirectors   = JSON.parse(row.favorite_directors || "{}");   } catch { /* keep empty */ }
  try { p.favoriteCompanies   = JSON.parse(row.favorite_production_companies || "{}"); } catch { /* keep empty */ }
  try { p.favoriteIndustries  = JSON.parse(row.favorite_industries || "{}");  } catch { /* keep empty */ }
  try { p.favoriteEras        = JSON.parse(row.favorite_eras || "{}");        } catch { /* keep empty */ }
  try { p.languagePreferences = JSON.parse(row.language_preferences || "{}"); } catch { /* keep empty */ }
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// TMDB helpers
// ─────────────────────────────────────────────────────────────────────────────
async function tmdbGet(path: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${TMDB}${path}${sep}api_key=${env.TMDB_API_KEY}`;
  if (tmdbMetaCache.has(url)) return tmdbMetaCache.get(url);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    tmdbMetaCache.set(url, data);
    return data;
  } catch (err: any) { 
    logger.warn({ module: "recommendationEngine", action: "TMDB_FETCH", status: "FAILED", error: err, message: `Failed to fetch TMDB data for ${path}` });
    return null; 
  }
}

async function getMovieDetail(tmdbId: number, type: "movie" | "tv"): Promise<any> {
  return tmdbGet(`/${type}/${tmdbId}?append_to_response=keywords,credits`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidate Pool — merge from many TMDB sources
// ─────────────────────────────────────────────────────────────────────────────
async function fetchCandidates(ratedMovies: MovieRow[]): Promise<any[]> {
  if (!env.TMDB_API_KEY) return [];

  const seen = new Map<number, any>();
  const add = (items: any[]) => {
    for (const item of items || []) {
      if (item?.id && !seen.has(item.id)) seen.set(item.id, item);
    }
  };

  if (ratedMovies.length === 0) {
    // Cold start — just use popular
    const [pop, topRated, trending] = await Promise.all([
      tmdbGet("/movie/popular"),
      tmdbGet("/movie/top_rated"),
      tmdbGet("/trending/all/day"),
    ]);
    add(pop?.results); add(topRated?.results); add(trending?.results);
    return Array.from(seen.values());
  }

  // Fetch similar + recommendations for ALL positively-rated movies
  const positive = ratedMovies.filter(m => (RATING_WEIGHTS[m.rating] ?? 0) > 0);

  const perMoviePromises = positive.map(m => {
    const t: "movie" | "tv" = m.type === "series" ? "tv" : "movie";
    return Promise.all([
      tmdbGet(`/${t}/${m.tmdb_id}/similar`),
      tmdbGet(`/${t}/${m.tmdb_id}/recommendations`),
    ]);
  });

  const globalPromises = Promise.all([
    tmdbGet("/trending/all/day"),
    tmdbGet("/trending/all/week"),
    tmdbGet("/movie/popular"),
    tmdbGet("/movie/top_rated"),
    tmdbGet("/tv/popular"),
    tmdbGet("/tv/top_rated"),
    tmdbGet("/movie/now_playing"),
    tmdbGet("/tv/on_the_air"),
    tmdbGet("/tv/airing_today"),
  ]);

  const [perMovieResults, globalResults] = await Promise.all([
    Promise.all(perMoviePromises),
    globalPromises,
  ]);

  for (const [sim, rec] of perMovieResults) {
    add(sim?.results); add(rec?.results);
  }
  for (const r of globalResults) add(r?.results);

  return Array.from(seen.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring helpers
// ─────────────────────────────────────────────────────────────────────────────
function normalize(map: Record<string, number>): Record<string, number> {
  const max = Math.max(...Object.values(map).map(Math.abs), 1);
  const out: Record<string, number> = {};
  for (const k in map) out[k] = map[k] / max;
  return out;
}

function scoreGenres(candidateGenres: string[], normGenres: Record<string, number>): number {
  if (!candidateGenres.length) return 0;
  const total = candidateGenres.reduce((sum, g) => sum + (normGenres[g] ?? 0), 0);
  return total / candidateGenres.length; // −1 … +1
}

function scoreDislike(candidateGenres: string[], normDisliked: Record<string, number>): number {
  if (!candidateGenres.length || !Object.keys(normDisliked).length) return 0;
  const total = candidateGenres.reduce((sum, g) => sum + (normDisliked[g] ?? 0), 0);
  return -(total / candidateGenres.length); // always negative = penalty
}

function scoreKeywords(candidateKw: string[], normKw: Record<string, number>): number {
  if (!candidateKw.length) return 0;
  const matches = candidateKw.filter(k => normKw[k] !== undefined);
  if (!matches.length) return 0;
  const total = matches.reduce((sum, k) => sum + normKw[k], 0);
  return Math.min(total / Math.max(Object.keys(normKw).length * 0.05, 1), 1);
}

function scoreDirector(directors: string[], normDirectors: Record<string, number>): number {
  for (const d of directors) {
    if (normDirectors[d] !== undefined) return Math.min(normDirectors[d], 1);
  }
  return 0;
}

function scoreActors(cast: string[], normActors: Record<string, number>): number {
  const scores = cast.map(a => normActors[a] ?? 0).filter(s => s !== 0);
  if (!scores.length) return 0;
  return Math.min(scores.reduce((a, b) => a + b, 0) / scores.length, 1);
}

function scoreCompanies(companies: string[], normCompanies: Record<string, number>): number {
  const scores = companies.map(c => normCompanies[c] ?? 0).filter(s => s !== 0);
  if (!scores.length) return 0;
  return Math.min(scores.reduce((a, b) => a + b, 0) / scores.length, 1);
}

function scoreEra(releaseYear: number, normEras: Record<string, number>): number {
  if (!releaseYear) return 0;
  const decade = `${Math.floor(releaseYear / 10) * 10}s`;
  return Math.min(normEras[decade] ?? 0, 1);
}

function scoreLanguage(lang: string, normLang: Record<string, number>): number {
  if (!lang) return 0;
  return Math.min(normLang[lang] ?? 0, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Score a single candidate
// ─────────────────────────────────────────────────────────────────────────────
interface ScoredCandidate extends RecommendationExplanation {
  _raw: number;
}

// Stage 1: fast pre-score using only data available on the list item (no TMDB detail fetch)
function scoreCandidateStage1(
  candidate: any,
  normGenres: Record<string, number>,
  normIndustries: Record<string, number>,
  normEras: Record<string, number>,
  normDisliked: Record<string, number>,
): number {
  const candidateGenres: string[] = (candidate.genre_ids || [])
    .map((id: number) => TMDB_GENRES[id])
    .filter(Boolean);
  const gScore = scoreGenres(candidateGenres, normGenres);
  const dkScore = scoreDislike(candidateGenres, normDisliked);

  const industryRaw = getFilmIndustry(candidate.original_language || "en");
  const iScore = Math.min(normIndustries[industryRaw] ?? 0, 1);

  const releaseDate = candidate.release_date || candidate.first_air_date || "";
  const releaseYear = parseInt(releaseDate.split("-")[0], 10) || 0;
  const eraScore = scoreEra(releaseYear, normEras);

  const tmdbScore = Math.min((candidate.vote_average || 0) / 10, 1);

  const availableWeight = SCORE_WEIGHTS.genre + SCORE_WEIGHTS.industry + SCORE_WEIGHTS.era + SCORE_WEIGHTS.tmdb + SCORE_WEIGHTS.dislike;
  return (
    gScore    * SCORE_WEIGHTS.genre    +
    iScore    * SCORE_WEIGHTS.industry +
    eraScore  * SCORE_WEIGHTS.era      +
    tmdbScore * SCORE_WEIGHTS.tmdb     +
    dkScore   * SCORE_WEIGHTS.dislike
  ) / availableWeight;
}

// Stage 2: full score with TMDB detail
async function scoreCandidate(
  candidate: any,
  prefs: UserPreferences,
  normGenres: Record<string, number>,
  normDisliked: Record<string, number>,
  normKw: Record<string, number>,
  normDirectors: Record<string, number>,
  normActors: Record<string, number>,
  normCompanies: Record<string, number>,
  normIndustries: Record<string, number>,
  normEras: Record<string, number>,
  normLang: Record<string, number>,
): Promise<ScoredCandidate | null> {
  const tmdbId: number = candidate.id;
  const type: "movie" | "tv" = candidate.media_type === "tv" || candidate.first_air_date ? "tv" : "movie";

  const detail = await getMovieDetail(tmdbId, type);

  // ── Genre ──
  const candidateGenres: string[] = (candidate.genre_ids || [])
    .map((id: number) => TMDB_GENRES[id])
    .filter(Boolean);
  const gScore = scoreGenres(candidateGenres, normGenres);
  const dkScore = scoreDislike(candidateGenres, normDisliked);

  // ── Keywords ──
  const kwList: string[] = [];
  if (detail) {
    const raw = detail?.keywords?.keywords || detail?.keywords?.results || [];
    raw.forEach((k: any) => { if (k.name) kwList.push(k.name.toLowerCase()); });
  }
  const kScore = scoreKeywords(kwList, normKw);

  // ── Director ──
  const crew: any[] = detail?.credits?.crew || [];
  const dirNames = crew.filter((c: any) => c.job === "Director").map((c: any) => c.name);
  const dScore = scoreDirector(dirNames, normDirectors);

  // ── Industry ──
  const industryRaw = detail
    ? getFilmIndustry({
        production_countries: detail.production_countries,
        production_companies: detail.production_companies,
        original_language: candidate.original_language,
      })
    : getFilmIndustry(candidate.original_language || "en");
  const iScore = Math.min(normIndustries[industryRaw] ?? 0, 1);

  // ── Actors ──
  const cast: string[] = (detail?.credits?.cast || []).slice(0, 5).map((a: any) => a.name);
  const aScore = scoreActors(cast, normActors);

  // ── Production Companies ──
  const companyNames: string[] = (detail?.production_companies || []).map((c: any) => c.name).filter(Boolean);
  const cScore = scoreCompanies(companyNames, normCompanies);

  // ── Era / Decade ──
  const releaseDate = candidate.release_date || candidate.first_air_date || "";
  const releaseYear = parseInt(releaseDate.split("-")[0], 10) || 0;
  const eraScore = scoreEra(releaseYear, normEras);

  // ── Language ──
  const langScore = scoreLanguage(candidate.original_language || "", normLang);

  // ── TMDB Rating ──
  const tmdbScore = Math.min((candidate.vote_average || 0) / 10, 1);

  // ── Composite (weighted sum) ──
  const raw =
    gScore    * SCORE_WEIGHTS.genre    +
    kScore    * SCORE_WEIGHTS.keyword  +
    dScore    * SCORE_WEIGHTS.director +
    iScore    * SCORE_WEIGHTS.industry +
    aScore    * SCORE_WEIGHTS.actor    +
    cScore    * SCORE_WEIGHTS.company  +
    eraScore  * SCORE_WEIGHTS.era      +
    langScore * SCORE_WEIGHTS.language +
    dkScore   * SCORE_WEIGHTS.dislike  +
    tmdbScore * SCORE_WEIGHTS.tmdb;

  // ── Build reasons ──
  const reasons: string[] = [];
  if (gScore > 0.3) {
    const top = candidateGenres.filter(g => (normGenres[g] ?? 0) > 0.3).slice(0, 2);
    if (top.length) reasons.push(`Strong genre match: ${top.join(", ")}`);
    else reasons.push("Matches genres you enjoy");
  }
  const topKw = kwList.filter(k => (normKw[k] ?? 0) > 0.3).slice(0, 3);
  if (topKw.length) reasons.push(`Keywords: ${topKw.join(", ")}`);
  if (dScore > 0.3 && dirNames.length) reasons.push(`Director you like: ${dirNames[0]}`);
  if (aScore > 0.3 && cast.length) reasons.push(`Features ${cast.filter(a => (normActors[a] ?? 0) > 0.3).slice(0, 2).join(", ") || cast[0]}`);
  if (cScore > 0.3 && companyNames.length) reasons.push(`From ${companyNames[0]}`);
  if (iScore > 0.3) reasons.push(`From ${industryRaw}`);
  if (tmdbScore >= 0.75) reasons.push("Highly rated globally");
  if (!reasons.length) reasons.push("Matches your overall taste");

  return {
    movieId: tmdbId,
    title: candidate.title || candidate.name,
    poster_url: candidate.poster_path ? `https://image.tmdb.org/t/p/w500${candidate.poster_path}` : null,
    score: 0, // filled after normalization
    reasons,
    media_type: type,
    genres: candidateGenres,
    release_year: releaseYear,
    vote_average: candidate.vote_average || 0,
    _raw: raw,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Diversity filter — limit same-director / same-decade clusters
// ─────────────────────────────────────────────────────────────────────────────
function applyDiversity(sorted: ScoredCandidate[]): ScoredCandidate[] {
  const directorCount: Record<string, number> = {};
  const decadeCount: Record<string, number> = {};
  const result: ScoredCandidate[] = [];
  const deferred: ScoredCandidate[] = [];

  for (const r of sorted) {
    const dirKey = r.reasons.find(s => s.startsWith("Director"))?.replace("Director you like: ", "") || "__none__";
    const decKey = r.release_year ? `${Math.floor(r.release_year / 10) * 10}s` : "__none__";

    const dc = directorCount[dirKey] || 0;
    const dec = decadeCount[decKey] || 0;

    if (dc >= 3 || dec >= 6) {
      deferred.push(r);
      continue;
    }

    directorCount[dirKey] = dc + 1;
    decadeCount[decKey] = dec + 1;
    result.push(r);
  }

  return [...result, ...deferred];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — generateRecommendations
// ─────────────────────────────────────────────────────────────────────────────
export async function generateRecommendations(
  username: string,
  options?: { offset?: number; limit?: number; allMovies?: MovieRow[] },
): Promise<RecommendationExplanation[]> {
  const start = Date.now();
  logger.info({ module: "recommendationEngine", action: "GENERATE_RECOMMENDATIONS", status: "STARTED", message: `Generating recommendations for ${username}` });

  const allMovies = options?.allMovies ?? await getUserMovies(username);

  // Use completed, rated movies for candidate sourcing only (not for profile building)
  const ratedMovies = allMovies.filter(m => m.status === "completed" && m.rating > 0);

  // Exclude anything already in the user's library
  const libraryIds = new Set(allMovies.map(m => m.tmdb_id));
  const libraryNames = new Set(allMovies.map(m => m.movie_name.toLowerCase().trim()));

  // ── Load User Preferences from DB (never rebuild at runtime) ──
  const dbProfile = await getRecommendationProfile(username);
  const prefs: UserPreferences = dbProfile ? parsePreferences(dbProfile) : emptyPreferences();

  // Pre-normalize all preference maps
  const normGenres     = normalize(prefs.favoriteGenres);
  const normDisliked   = normalize(prefs.dislikedGenres);
  const normKw: Record<string, number> = {}; // keywords are not stored in profile; scored from TMDB overlap
  const normDirectors  = normalize(prefs.favoriteDirectors);
  const normActors     = normalize(prefs.favoriteActors);
  const normCompanies  = normalize(prefs.favoriteCompanies);
  const normIndustries = normalize(prefs.favoriteIndustries);
  const normEras       = normalize(prefs.favoriteEras);
  const normLang       = normalize(prefs.languagePreferences);

  // ── Candidate pool (always fresh from TMDB) ──
  const rawCandidates = await fetchCandidates(ratedMovies);

  // Hard filter: remove actual library entries
  let candidates = rawCandidates.filter(c => {
    if (!c?.id) return false;
    if (libraryIds.has(c.id)) return false;
    const title = (c.title || c.name || "").toLowerCase().trim();
    if (libraryNames.has(title)) return false;
    return true;
  });

  // Limit candidates via Fast Heuristic Pre-Scoring (Stage 1)
  candidates = candidates
    .map(c => ({
      candidate: c,
      stage1Score: scoreCandidateStage1(c, normGenres, normIndustries, normEras, normDisliked),
    }))
    .sort((a, b) => b.stage1Score - a.stage1Score)
    .slice(0, 60)
    .map(item => item.candidate);

  // ── Cold start: no ratings → rank by TMDB score ──
  if (ratedMovies.length === 0) {
    const fallback = candidates
      .map(c => ({
        movieId: c.id,
        title: c.title || c.name,
        poster_url: c.poster_path ? `https://image.tmdb.org/t/p/w500${c.poster_path}` : null,
        score: Math.min(Math.round((c.vote_average || 0) * 10), 99),
        reasons: ["Popular right now"],
        media_type: (c.media_type || (c.first_air_date ? "tv" : "movie")) as "movie" | "tv",
        genres: (c.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean),
        release_year: parseInt((c.release_date || c.first_air_date || "0").split("-")[0], 10) || 0,
        vote_average: c.vote_average || 0,
      } as RecommendationExplanation))
      .sort((a, b) => b.score - a.score);

    if (options?.offset !== undefined && options.limit) {
      return fallback.slice(options.offset, options.offset + options.limit);
    }
    return fallback;
  }

  // ── Score all candidates (batched to control concurrency) ──
  const SCORE_BATCH = 20;
  const scored: ScoredCandidate[] = [];

  for (let i = 0; i < candidates.length; i += SCORE_BATCH) {
    const batch = candidates.slice(i, i + SCORE_BATCH);
    const results = await Promise.all(
      batch.map(c => scoreCandidate(
        c, prefs,
        normGenres, normDisliked, normKw, normDirectors, normActors,
        normCompanies, normIndustries, normEras, normLang,
      ))
    );
    for (const r of results) { if (r) scored.push(r); }
  }

  // Deduplicate by movieId, keep highest raw
  const deduped = new Map<number, ScoredCandidate>();
  for (const r of scored) {
    const existing = deduped.get(r.movieId);
    if (!existing || r._raw > existing._raw) deduped.set(r.movieId, r);
  }

  const arr = Array.from(deduped.values());

  // Normalize raw scores to 0–99 range
  const maxRaw = Math.max(...arr.map(r => r._raw), 0.0001);
  const minRaw = Math.min(...arr.map(r => r._raw), 0);
  const range  = maxRaw - minRaw || 1;

  for (const r of arr) {
    r.score = Math.min(Math.round(((r._raw - minRaw) / range) * 99), 99);
  }

  // Sort descending, apply diversity, cut anything below score 10
  const sorted = arr
    .filter(r => r.score >= 10)
    .sort((a, b) => b.score - a.score);

  const diversified = applyDiversity(sorted);

  logger.info({ module: "recommendationEngine", action: "GENERATE_RECOMMENDATIONS", status: "SUCCESS", durationMs: Date.now() - start, message: `Generated ${diversified.length} recommendations` });

  if (options?.offset !== undefined && options.limit) {
    return diversified.slice(options.offset, options.offset + options.limit);
  }
  return diversified;
}

// ─────────────────────────────────────────────────────────────────────────────
// getUserTopGenres — used by discover route for genre sections
// Now reads from the persistent profile instead of scanning the Movies table
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserTopGenres(username: string): Promise<string[]> {
  const dbProfile = await getRecommendationProfile(username);
  if (dbProfile) {
    try {
      const genres: Record<string, number> = JSON.parse(dbProfile.favorite_genres || "{}");
      return Object.entries(genres)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);
    } catch { /* fall through to fallback */ }
  }

  // Fallback: scan library directly (cold start before profile is generated)
  const allMovies = await getUserMovies(username);
  const ratedMovies = allMovies.filter(m => m.status === "completed" && m.rating > 0);

  const genreScores: Record<string, number> = {};
  ratedMovies.forEach(m => {
    const w = RATING_WEIGHTS[m.rating] ?? 0;
    if (w <= 0) return;
    let genres: string[] = [];
    try { genres = JSON.parse(m.genres); }
    catch { genres = m.genres ? m.genres.split(",").map(s => s.trim()) : []; }
    genres.forEach(g => { genreScores[g] = (genreScores[g] || 0) + w; });
  });

  return Object.entries(genreScores)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}
