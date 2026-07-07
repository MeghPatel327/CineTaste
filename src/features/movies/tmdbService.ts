import { env } from "@/lib/env";

export interface TMDBResult {
  id: number;
  title?: string;
  name?: string; // for tv
  overview: string;
  poster_path: string | null;
  media_type: "movie" | "tv";
  release_date?: string;
  first_air_date?: string;
  original_language: string;
  genre_ids: number[];
}

export interface TMDBDetail {
  id: number;
  genres: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  original_language: string;
  backdrop_path?: string | null;
  tagline?: string;
  vote_average?: number;
  vote_count?: number;
  original_title?: string;
  original_name?: string;
  production_countries?: any[];
  production_companies?: any[];
  origin_country?: string[];
  credits?: {
    cast: any[];
    crew: any[];
  };
  videos?: {
    results: any[];
  };
  similar?: {
    results: any[];
  };
  keywords?: {
    keywords?: any[];
    results?: any[];
  };
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * Retry-aware fetch wrapper for TMDB. Retries on network errors and 429/5xx.
 * Uses exponential backoff: 500ms, 1000ms, 2000ms.
 */
async function tmdbFetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);

      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        const delay = 500 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        const delay = 500 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error("tmdbFetchWithRetry: all retries exhausted");
}

export async function searchTMDB(query: string): Promise<TMDBResult[]> {
  if (!env.TMDB_API_KEY) return [];
  const res = await tmdbFetchWithRetry(`${TMDB_BASE_URL}/search/multi?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("TMDB search failed");
  const data = await res.json();
  return data.results.filter((r: any) => r.media_type === "movie" || r.media_type === "tv");
}

export async function getTMDBDetails(id: number, type: "movie" | "tv", append = "credits,videos,similar,keywords"): Promise<TMDBDetail | null> {
  if (!env.TMDB_API_KEY) return null;
  const res = await tmdbFetchWithRetry(`${TMDB_BASE_URL}/${type}/${id}?api_key=${env.TMDB_API_KEY}&append_to_response=${append}`);
  if (!res.ok) throw new Error("TMDB details failed");
  return await res.json();
}

export function getTMDBPosterUrl(path: string | null, size = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function extractDirector(credits: any) {
  if (!credits?.crew) return null;
  return credits.crew.find((c: any) => c.job === "Director") || null;
}

export function extractWriters(credits: any) {
  if (!credits?.crew) return [];
  return credits.crew.filter((c: any) => c.department === "Writing" || c.job === "Screenplay" || c.job === "Writer");
}

export function extractTopCast(credits: any, limit = 15) {
  if (!credits?.cast) return [];
  return credits.cast.slice(0, limit);
}

export function extractProductionCompanies(details: TMDBDetail) {
  return details.production_companies || [];
}

export function extractProductionCountries(details: TMDBDetail) {
  return details.production_countries || [];
}

export function extractKeywords(details: TMDBDetail) {
  if (!details.keywords) return [];
  return details.keywords.keywords || details.keywords.results || [];
}
