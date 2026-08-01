import { MovieRow, getUserMovies } from "@/features/movies/movieRepository";
import { env } from "@/lib/env";
import { getFilmIndustry } from "@/lib/utils";

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
  genre:   0.45,
  keyword: 0.20,
  director:0.10,
  industry:0.08,
  actor:   0.05,
  runtime: 0.04,
  decade:  0.04,
  tmdb:    0.04,
};

const TMDB_GENRES: Record<number, string> = {
  28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",
  99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",
  27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Science Fiction",
  10770:"TV Movie",53:"Thriller",10752:"War",37:"Western",
  10759:"Action & Adventure",10762:"Kids",10765:"Sci-Fi & Fantasy",
};

// ─────────────────────────────────────────────────────────────────────────────
// In-process caches (per server instance, resets on redeploy)
// ─────────────────────────────────────────────────────────────────────────────
const tmdbMetaCache = new Map<string, any>();          // TMDB detail responses
const tasteProfileCache = new Map<string, TasteProfile>(); // per username

interface CachedRecommendations {
  hash: string;
  recommendations: RecommendationExplanation[];
}
const recommendationsCache = new Map<string, CachedRecommendations>();

function computeDataHash(movies: MovieRow[]): string {
  const sorted = [...movies].sort((a, b) => a.id - b.id);
  return sorted.map(m => `${m.id}:${m.status}:${m.rating}`).join("|");
}

// ─────────────────────────────────────────────────────────────────────────────
// Taste Profile
// ─────────────────────────────────────────────────────────────────────────────
interface TasteProfile {
  genres:      Record<string, number>;
  keywords:    Record<string, number>;
  directors:   Record<string, number>;
  actors:      Record<string, number>;
  industries:  Record<string, number>;
  runtimes:    number[];   // collect runtimes of positively rated films
  decades:     Record<string, number>;
  builtAt:     number;     // Date.now()
}

function emptyProfile(): TasteProfile {
  return { genres:{}, keywords:{}, directors:{}, actors:{},
           industries:{}, runtimes:[], decades:{}, builtAt:0 };
}

function addWeighted(map: Record<string, number>, key: string, w: number) {
  if (!key) return;
  map[key] = (map[key] || 0) + w;
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
  } catch { return null; }
}

async function getMovieDetail(tmdbId: number, type: "movie" | "tv"): Promise<any> {
  return tmdbGet(`/${type}/${tmdbId}?append_to_response=keywords,credits`);
}

async function getKeywords(tmdbId: number, type: "movie" | "tv"): Promise<string[]> {
  const detail = await getMovieDetail(tmdbId, type);
  if (!detail) return [];
  // keywords lives under detail.keywords.keywords (movie) or detail.keywords.results (tv)
  const list = detail?.keywords?.keywords || detail?.keywords?.results || [];
  return list.map((k: any) => k.name?.toLowerCase()).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Taste Profile from ALL rated movies
// ─────────────────────────────────────────────────────────────────────────────
async function buildTasteProfile(ratedMovies: MovieRow[]): Promise<TasteProfile> {
  const profile = emptyProfile();

  // Fetch TMDB detail for each rated movie in parallel (with concurrency limit)
  const BATCH = 20;
  for (let i = 0; i < ratedMovies.length; i += BATCH) {
    const batch = ratedMovies.slice(i, i + BATCH);
    await Promise.all(batch.map(async (m) => {
      const w = RATING_WEIGHTS[m.rating] ?? 0;
      const type: "movie" | "tv" = m.type === "series" ? "tv" : "movie";

      // ── Genres (stored locally) ──
      let genres: string[] = [];
      try { genres = JSON.parse(m.genres); }
      catch { genres = m.genres ? m.genres.split(",").map(s => s.trim()) : []; }
      genres.forEach(g => addWeighted(profile.genres, g, w));

      // ── Decade ──
      if (m.release_year > 0) {
        const decade = `${Math.floor(m.release_year / 10) * 10}s`;
        addWeighted(profile.decades, decade, w);
      }

      // ── Runtime (only positive ratings) ──
      if (m.runtime > 0 && w > 0) profile.runtimes.push(m.runtime);

      // ── Film Industry ──
      const industry = getFilmIndustry(m.language || "en");
      addWeighted(profile.industries, industry, w);

      // ── TMDB detail for keywords, director, cast ──
      const detail = await getMovieDetail(m.tmdb_id, type);
      if (!detail) return;

      // Keywords
      const kwList = detail?.keywords?.keywords || detail?.keywords?.results || [];
      kwList.forEach((k: any) => {
        if (k.name) addWeighted(profile.keywords, k.name.toLowerCase(), w);
      });

      // Director (from crew, job === "Director")
      const crew: any[] = detail?.credits?.crew || [];
      crew.filter((c: any) => c.job === "Director")
          .forEach((c: any) => addWeighted(profile.directors, c.name, w));

      // Top 5 cast
      const cast: any[] = (detail?.credits?.cast || []).slice(0, 5);
      cast.forEach((a: any) => addWeighted(profile.actors, a.name, w));
    }));
  }

  profile.builtAt = Date.now();
  return profile;
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

function preferredRuntime(runtimes: number[]): number {
  if (!runtimes.length) return 0;
  return Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length);
}

function scoreGenres(candidateGenres: string[], normGenres: Record<string, number>): number {
  if (!candidateGenres.length) return 0;
  const total = candidateGenres.reduce((sum, g) => sum + (normGenres[g] ?? 0), 0);
  return total / candidateGenres.length; // −1 … +1
}

function scoreKeywords(candidateKw: string[], normKw: Record<string, number>): number {
  if (!candidateKw.length) return 0;
  const matches = candidateKw.filter(k => normKw[k] !== undefined);
  if (!matches.length) return 0;
  const total = matches.reduce((sum, k) => sum + normKw[k], 0);
  // Normalize against number of user keywords known (cap at 1)
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

function scoreRuntime(runtime: number, preferred: number): number {
  if (!runtime || !preferred) return 0;
  const diff = Math.abs(runtime - preferred);
  if (diff <= 15) return 1;
  if (diff <= 30) return 0.7;
  if (diff <= 60) return 0.3;
  return 0;
}

function scoreDecade(releaseYear: number, normDecades: Record<string, number>): number {
  if (!releaseYear) return 0;
  const decade = `${Math.floor(releaseYear / 10) * 10}s`;
  return Math.min(normDecades[decade] ?? 0, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Score a single candidate (Stage 1 & Stage 2)
// ─────────────────────────────────────────────────────────────────────────────
interface ScoredCandidate extends RecommendationExplanation {
  _raw: number; // pre-normalization composite
}

function scoreCandidateStage1(
  candidate: any,
  normGenres: Record<string, number>,
  normIndustries: Record<string, number>,
  normDecades: Record<string, number>
): number {
  const candidateGenres: string[] = (candidate.genre_ids || [])
    .map((id: number) => TMDB_GENRES[id])
    .filter(Boolean);
  const gScore = scoreGenres(candidateGenres, normGenres);

  const industryRaw = getFilmIndustry(candidate.original_language || "en");
  const iScore = Math.min(normIndustries[industryRaw] ?? 0, 1);

  const releaseDate = candidate.release_date || candidate.first_air_date || "";
  const releaseYear = parseInt(releaseDate.split("-")[0], 10) || 0;
  const decScore = scoreDecade(releaseYear, normDecades);

  const tmdbScore = Math.min((candidate.vote_average || 0) / 10, 1);

  const availableWeight = SCORE_WEIGHTS.genre + SCORE_WEIGHTS.industry + SCORE_WEIGHTS.decade + SCORE_WEIGHTS.tmdb;
  return (
    gScore   * SCORE_WEIGHTS.genre    +
    iScore   * SCORE_WEIGHTS.industry +
    decScore * SCORE_WEIGHTS.decade   +
    tmdbScore * SCORE_WEIGHTS.tmdb
  ) / availableWeight;
}

async function scoreCandidate(
  candidate: any,
  profile: TasteProfile,
  normGenres: Record<string, number>,
  normKw: Record<string, number>,
  normDirectors: Record<string, number>,
  normActors: Record<string, number>,
  normIndustries: Record<string, number>,
  normDecades: Record<string, number>,
  prefRuntime: number,
): Promise<ScoredCandidate | null> {
  const tmdbId: number = candidate.id;
  const type: "movie" | "tv" = candidate.media_type === "tv" || candidate.first_air_date ? "tv" : "movie";

  // Candidate TMDB detail (keywords, credits)
  const detail = await getMovieDetail(tmdbId, type);

  // ── Genre ──
  const candidateGenres: string[] = (candidate.genre_ids || [])
    .map((id: number) => TMDB_GENRES[id])
    .filter(Boolean);
  const gScore = scoreGenres(candidateGenres, normGenres);

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

  // ── Runtime ──
  const runtime = detail?.runtime || detail?.episode_run_time?.[0] || 0;
  const rScore = scoreRuntime(runtime, prefRuntime);

  // ── Decade ──
  const releaseDate = candidate.release_date || candidate.first_air_date || "";
  const releaseYear = parseInt(releaseDate.split("-")[0], 10) || 0;
  const decScore = scoreDecade(releaseYear, normDecades);

  // ── TMDB Rating ──
  const tmdbScore = Math.min((candidate.vote_average || 0) / 10, 1);

  // ── Composite (weighted sum, −1 … +1 range each) ──
  const raw =
    gScore   * SCORE_WEIGHTS.genre    +
    kScore   * SCORE_WEIGHTS.keyword  +
    dScore   * SCORE_WEIGHTS.director +
    iScore   * SCORE_WEIGHTS.industry +
    aScore   * SCORE_WEIGHTS.actor    +
    rScore   * SCORE_WEIGHTS.runtime  +
    decScore * SCORE_WEIGHTS.decade   +
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

  // Append deferred at the end (they still appear, just later)
  return [...result, ...deferred];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — generateRecommendations
// ─────────────────────────────────────────────────────────────────────────────
export async function generateRecommendations(
  username: string,
  options?: { offset?: number; limit?: number; allMovies?: MovieRow[] },
): Promise<RecommendationExplanation[]> {
  const allMovies = options?.allMovies ?? await getUserMovies(username);

  // ── Smart Data-Driven Cache ──
  const dataHash = computeDataHash(allMovies);
  if (recommendationsCache.has(username)) {
    const cached = recommendationsCache.get(username)!;
    if (cached.hash === dataHash) {
      if (options?.offset !== undefined && options.limit) {
        return cached.recommendations.slice(options.offset, options.offset + options.limit);
      }
      return cached.recommendations;
    }
  }

  // Use completed, rated movies for building the taste profile
  const ratedMovies = allMovies.filter(m => m.status === "completed" && m.rating > 0);

  // Exclude anything already in the user's library
  const libraryIds = new Set(allMovies.map(m => m.tmdb_id));
  const libraryNames = new Set(allMovies.map(m => m.movie_name.toLowerCase().trim()));

  // ── Taste Profile (cache unless cold start) ──
  let profile: TasteProfile;
  if (tasteProfileCache.has(username)) {
    profile = tasteProfileCache.get(username)!;
  } else {
    profile = ratedMovies.length > 0
      ? await buildTasteProfile(ratedMovies)
      : emptyProfile();
    tasteProfileCache.set(username, profile);
  }

  // Pre-normalize all profile maps
  const normGenres     = normalize(profile.genres);
  const normKw         = normalize(profile.keywords);
  const normDirectors  = normalize(profile.directors);
  const normActors     = normalize(profile.actors);
  const normIndustries = normalize(profile.industries);
  const normDecades    = normalize(profile.decades);
  const prefRuntime    = preferredRuntime(profile.runtimes);

  // ── Candidate pool ──
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
      stage1Score: scoreCandidateStage1(c, normGenres, normIndustries, normDecades)
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
        c, profile,
        normGenres, normKw, normDirectors, normActors,
        normIndustries, normDecades, prefRuntime,
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

  // Cache the full results
  recommendationsCache.set(username, {
    hash: dataHash,
    recommendations: diversified
  });

  if (options?.offset !== undefined && options.limit) {
    return diversified.slice(options.offset, options.offset + options.limit);
  }
  return diversified;
}

// ─────────────────────────────────────────────────────────────────────────────
// getUserTopGenres — used by discover route for genre sections
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserTopGenres(username: string): Promise<string[]> {
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

// ─────────────────────────────────────────────────────────────────────────────
// invalidateTasteProfile — call after user rates/edits/deletes a movie
// ─────────────────────────────────────────────────────────────────────────────
export function invalidateTasteProfile(username: string): void {
  tasteProfileCache.delete(username);
  recommendationsCache.delete(username);
}
