import { baserowCreate, baserowDelete, baserowGet, baserowUpdate } from "@/lib/baserow";
import { env } from "@/lib/env";

export interface MovieRow {
  id: number;
  username: string;
  movie_name: string;
  type: "movie" | "series";
  status: "completed" | "pending" | "dropped";
  rating: number;
  watch_order_rank: number | null;
  watch_link: string | null;
  tmdb_id: number;
  genres: string; // Stored as comma separated or JSON string
  release_year: number;
  runtime: number;
  language: string;
  poster_url: string;
  overview: string;
  created_at: string;
  updated_at: string;
}

export async function getUserMovies(username: string): Promise<MovieRow[]> {
  const response = await baserowGet<MovieRow>(env.BASEROW_MOVIES_TABLE_ID, {
    search: username, // Manual filter below to ensure exact match
  });
  return response.results.filter((m) => m.username === username);
}

export async function addMovie(data: Omit<MovieRow, "id" | "created_at" | "updated_at">): Promise<MovieRow> {
  const now = new Date().toISOString();
  return baserowCreate<MovieRow>(env.BASEROW_MOVIES_TABLE_ID, {
    ...data,
    created_at: now,
    updated_at: now,
  });
}

export async function updateMovie(id: number, data: Partial<Omit<MovieRow, "id" | "created_at" | "username">>): Promise<MovieRow> {
  const now = new Date().toISOString();
  return baserowUpdate<MovieRow>(env.BASEROW_MOVIES_TABLE_ID, id, {
    ...data,
    updated_at: now,
  });
}

export async function deleteMovie(id: number): Promise<void> {
  return baserowDelete(env.BASEROW_MOVIES_TABLE_ID, id);
}

export async function getMovieById(id: number): Promise<MovieRow | null> {
  // Since we don't have a direct get by ID wrapper, we can fetch all or search by ID if possible.
  // Actually, Baserow GET /row/table/row_id exists. Let's add it to baserowGet.
  // We can just use the baserowUpdate endpoint with GET method conceptually, but we didn't implement it.
  // Let's implement baserowGetRow in baserow.ts and use it, or just use a generic fetch here.
  const url = `${env.BASEROW_API_URL}/api/database/rows/table/${env.BASEROW_MOVIES_TABLE_ID}/${id}/?user_field_names=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Token ${env.BASEROW_API_TOKEN}`, "Content-Type": "application/json" }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch movie");
  return res.json();
}
