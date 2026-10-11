import { MovieRow, getUserMovies } from "@/features/movies/movieRepository";
import { getRecommendationProfile, saveRecommendationProfile } from "./recommendationProfileRepository";
import { env } from "@/lib/env";
import { getFilmIndustry } from "@/lib/utils";
import crypto from "crypto";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const TMDB = "https://api.themoviedb.org/3";
const ENGINE_VERSION = "3.1";

const RATING_WEIGHTS: Record<number, number> = {
  10: 2.0, 9: 1.5, 8: 1.0, 7: 0.5, 6: 0.0,
  5: -0.25, 4: -0.5, 3: -1.0, 2: -1.5, 1: -2.0,
};

// ─────────────────────────────────────────────────────────────────────────────
// In-process TMDB cache (per server instance, resets on redeploy)
// ─────────────────────────────────────────────────────────────────────────────
const tmdbMetaCache = new Map<string, any>();

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
    logger.warn({ module: "profileGenerator", action: "TMDB_FETCH", status: "FAILED", error: err, message: `Failed to fetch TMDB details for ${path}` });
    return null; 
  }
}

async function getMovieDetail(tmdbId: number, type: "movie" | "tv"): Promise<any> {
  return tmdbGet(`/${type}/${tmdbId}?append_to_response=keywords,credits`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function addWeighted(map: Record<string, number>, key: string, w: number) {
  if (!key) return;
  map[key] = (map[key] || 0) + w;
}

function computeLibraryHash(movies: MovieRow[]): string {
  const sorted = [...movies].sort((a, b) => a.id - b.id);
  const raw = sorted.map(m => `${m.id}:${m.status}:${m.rating}:${m.watch_order_rank}`).join("|");
  return crypto.createHash("md5").update(raw).digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Generation — called asynchronously on library mutations
// ─────────────────────────────────────────────────────────────────────────────
export async function generateProfileAsync(username: string): Promise<void> {
  const start = Date.now();
  logger.info({ module: "profileGenerator", action: "GENERATE_PROFILE", status: "STARTED", message: `Starting profile generation for ${username}` });
  try {
    const movies = await getUserMovies(username);
    const hash = computeLibraryHash(movies);

    // Skip if nothing changed and engine version is the same
    const existing = await getRecommendationProfile(username);
    if (existing?.library_hash === hash && existing?.engine_version === ENGINE_VERSION) {
      logger.info({ module: "profileGenerator", action: "GENERATE_PROFILE", status: "SUCCESS", message: `Skipped profile generation for ${username} (no changes)` });
      return;
    }

    const profileMovies = movies.filter(m => (m.status === "completed" && m.rating > 0) || m.status === "dropped");

    // Accumulate weighted preference maps
    const favoriteGenres: Record<string, number> = {};
    const dislikedGenres: Record<string, number> = {};
    const favoriteActors: Record<string, number> = {};
    const favoriteDirectors: Record<string, number> = {};
    const favoriteProductionCompanies: Record<string, number> = {};
    const favoriteIndustries: Record<string, number> = {};
    const favoriteEras: Record<string, number> = {};
    const languagePreferences: Record<string, number> = {};

    const BATCH = 20;
    for (let i = 0; i < profileMovies.length; i += BATCH) {
      const batch = profileMovies.slice(i, i + BATCH);
      await Promise.all(batch.map(async (m) => {
        const w = m.status === "dropped" ? -2.0 : (RATING_WEIGHTS[m.rating] ?? 0);
        const type: "movie" | "tv" = m.type === "series" ? "tv" : "movie";

        // ── Genres ──
        let genres: string[] = [];
        try { genres = JSON.parse(m.genres); }
        catch { genres = m.genres ? m.genres.split(",").map(s => s.trim()) : []; }

        genres.forEach(g => {
          if (w > 0) {
            addWeighted(favoriteGenres, g, w);
          } else if (w < 0) {
            addWeighted(dislikedGenres, g, Math.abs(w));
          }
        });

        // ── Era / Decade ──
        if (m.release_year > 0) {
          const decade = `${Math.floor(m.release_year / 10) * 10}s`;
          if (w > 0) addWeighted(favoriteEras, decade, w);
        }

        // ── Film Industry ──
        const industry = getFilmIndustry(m.language || "en");
        if (w > 0) addWeighted(favoriteIndustries, industry, w);

        // ── Language ──
        if (m.language && w > 0) {
          addWeighted(languagePreferences, m.language, w);
        }

        // ── TMDB detail for keywords, director, cast, production companies ──
        const detail = await getMovieDetail(m.tmdb_id, type);
        if (!detail) return;

        // Director (from crew, job === "Director")
        if (w > 0) {
          const crew: any[] = detail?.credits?.crew || [];
          crew.filter((c: any) => c.job === "Director")
            .forEach((c: any) => addWeighted(favoriteDirectors, c.name, w));
        }

        // Top 5 cast
        if (w > 0) {
          const cast: any[] = (detail?.credits?.cast || []).slice(0, 5);
          cast.forEach((a: any) => addWeighted(favoriteActors, a.name, w));
        }

        // Production companies
        if (w > 0) {
          const companies: any[] = detail?.production_companies || [];
          companies.forEach((c: any) => {
            if (c.name) addWeighted(favoriteProductionCompanies, c.name, w);
          });
        }
      }));
    }

    // ── Persist to Baserow ──
    await saveRecommendationProfile({
      username,
      favorite_genres: JSON.stringify(favoriteGenres),
      disliked_genres: JSON.stringify(dislikedGenres),
      favorite_actors: JSON.stringify(favoriteActors),
      favorite_directors: JSON.stringify(favoriteDirectors),
      favorite_production_companies: JSON.stringify(favoriteProductionCompanies),
      favorite_industries: JSON.stringify(favoriteIndustries),
      favorite_eras: JSON.stringify(favoriteEras),
      language_preferences: JSON.stringify(languagePreferences),
      library_hash: hash,
      engine_version: ENGINE_VERSION,
    });
    
    logger.info({ module: "profileGenerator", action: "GENERATE_PROFILE", status: "SUCCESS", durationMs: Date.now() - start, message: `Profile generated for ${username}` });

  } catch (err: any) {
    logger.error({ module: "profileGenerator", action: "GENERATE_PROFILE", status: "FAILED", durationMs: Date.now() - start, error: err, message: "Profile generation failed" });
  }
}
