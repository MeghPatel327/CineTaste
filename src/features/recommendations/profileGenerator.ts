import { MovieRow, getUserMovies } from "@/features/movies/movieRepository";
import { getRecommendationProfile, saveRecommendationProfile } from "./recommendationProfileRepository";
import { env } from "@/lib/env";
import { getFilmIndustry } from "@/lib/utils";
import crypto from "crypto";

const TMDB = "https://api.themoviedb.org/3";

const RATING_WEIGHTS: Record<number, number> = {
  10: 2.0, 9: 1.5, 8: 1.0, 7: 0.5, 6: 0.0,
  5: -0.25, 4: -0.5, 3: -1.0, 2: -1.5, 1: -2.0,
};

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
  } catch { return null; }
}

async function getMovieDetail(tmdbId: number, type: "movie" | "tv"): Promise<any> {
  return tmdbGet(`/${type}/${tmdbId}?append_to_response=keywords,credits`);
}

interface TasteProfile {
  genres: Record<string, number>;
  keywords: Record<string, number>;
  directors: Record<string, number>;
  actors: Record<string, number>;
  industries: Record<string, number>;
  runtimes: number[];
  decades: Record<string, number>;
  builtAt: number;
}

function emptyProfile(): TasteProfile {
  return { genres: {}, keywords: {}, directors: {}, actors: {}, industries: {}, runtimes: [], decades: {}, builtAt: 0 };
}

function addWeighted(map: Record<string, number>, key: string, w: number) {
  if (!key) return;
  map[key] = (map[key] || 0) + w;
}

function computeLibraryHash(movies: MovieRow[]): string {
  const sorted = [...movies].sort((a, b) => a.id - b.id);
  const raw = sorted.map(m => `${m.id}:${m.status}:${m.rating}:${m.watch_order_rank}`).join("|");
  return crypto.createHash("md5").update(raw).digest("hex");
}

export async function generateProfileAsync(username: string): Promise<void> {
  try {
    const movies = await getUserMovies(username);
    const hash = computeLibraryHash(movies);
    
    const existing = await getRecommendationProfile(username);
    if (existing?.library_hash === hash && existing?.generation_status === "Ready") {
      return; // Already up to date
    }

    await saveRecommendationProfile({
      username,
      generation_status: "Updating",
    });

    const ratedMovies = movies.filter(m => m.status === "completed" && m.rating > 0);
    const profile = emptyProfile();
    const BATCH = 20;

    for (let i = 0; i < ratedMovies.length; i += BATCH) {
      const batch = ratedMovies.slice(i, i + BATCH);
      await Promise.all(batch.map(async (m) => {
        const w = RATING_WEIGHTS[m.rating] ?? 0;
        const type: "movie" | "tv" = m.type === "series" ? "tv" : "movie";

        let genres: string[] = [];
        try { genres = JSON.parse(m.genres); }
        catch { genres = m.genres ? m.genres.split(",").map(s => s.trim()) : []; }
        genres.forEach(g => addWeighted(profile.genres, g, w));

        if (m.release_year > 0) {
          const decade = `${Math.floor(m.release_year / 10) * 10}s`;
          addWeighted(profile.decades, decade, w);
        }

        if (m.runtime > 0 && w > 0) profile.runtimes.push(m.runtime);

        const industry = getFilmIndustry(m.language || "en");
        addWeighted(profile.industries, industry, w);

        const detail = await getMovieDetail(m.tmdb_id, type);
        if (!detail) return;

        const kwList = detail?.keywords?.keywords || detail?.keywords?.results || [];
        kwList.forEach((k: any) => {
          if (k.name) addWeighted(profile.keywords, k.name.toLowerCase(), w);
        });

        const crew: any[] = detail?.credits?.crew || [];
        crew.filter((c: any) => c.job === "Director")
            .forEach((c: any) => addWeighted(profile.directors, c.name, w));

        const cast: any[] = (detail?.credits?.cast || []).slice(0, 5);
        cast.forEach((a: any) => addWeighted(profile.actors, a.name, w));
      }));
    }
    profile.builtAt = Date.now();

    // ── Generate Dashboard Stats ──
    const total = movies.length;
    const watched = movies.filter(m => m.status === "completed").length;
    const pending = movies.filter(m => m.status === "pending").length;
    
    const next5 = movies
      .filter(m => m.status === "pending")
      .sort((a, b) => (a.watch_order_rank || Infinity) - (b.watch_order_rank || Infinity))
      .slice(0, 5);

    // Insights logic
    const insights = [];
    
    const sortedGenres = Object.entries(profile.genres).sort((a, b) => b[1] - a[1]);
    if (sortedGenres.length > 0) {
      insights.push({ title: "Favorite Genre", value: sortedGenres[0][0], description: "Based on your ratings" });
    }

    const avgRating = ratedMovies.length > 0
      ? (ratedMovies.reduce((acc, m) => acc + Number(m.rating || 0), 0) / ratedMovies.length).toFixed(1)
      : "0.0";
    insights.push({ title: "Average Rating", value: avgRating.toString(), description: "Your overall taste" });

    const sortedDecades = Object.entries(profile.decades).sort((a, b) => b[1] - a[1]);
    if (sortedDecades.length > 0) {
      insights.push({ title: "Favorite Era", value: `${sortedDecades[0][0]} Cinema`, description: "Most rated decade" });
    }

    if (profile.runtimes.length > 0) {
      const avgRuntime = Math.round(profile.runtimes.reduce((a, b) => a + b, 0) / profile.runtimes.length);
      insights.push({ title: "Runtime Preference", value: `${avgRuntime} mins`, description: "Your sweet spot" });
    }

    const dashboardCache = {
      stats: { total, watched, pending },
      next5,
      insights,
    };

    await saveRecommendationProfile({
      username,
      recommendation_profile: JSON.stringify(profile),
      dashboard_cache: JSON.stringify(dashboardCache),
      library_hash: hash,
      generation_status: "Ready",
      engine_version: "2.0",
      recommendation_confidence: ratedMovies.length > 10 ? 95 : ratedMovies.length * 9.5,
      last_error: "",
    });

  } catch (err: any) {
    console.error("Profile Generation Failed", err);
    await saveRecommendationProfile({
      username,
      generation_status: "Failed",
      last_error: err?.message || String(err),
    });
  }
}
