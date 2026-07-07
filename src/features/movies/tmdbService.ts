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
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function searchTMDB(query: string): Promise<TMDBResult[]> {
  if (!env.TMDB_API_KEY) return [];
  const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("TMDB search failed");
  const data = await res.json();
  return data.results.filter((r: any) => r.media_type === "movie" || r.media_type === "tv");
}

export async function getTMDBDetails(id: number, type: "movie" | "tv"): Promise<TMDBDetail | null> {
  if (!env.TMDB_API_KEY) return null;
  const res = await fetch(`${TMDB_BASE_URL}/${type}/${id}?api_key=${env.TMDB_API_KEY}`);
  if (!res.ok) throw new Error("TMDB details failed");
  return await res.json();
}

export function getTMDBPosterUrl(path: string | null, size = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
