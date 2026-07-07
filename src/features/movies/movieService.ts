import { z } from "zod";
import { getUserMovies, addMovie, updateMovie, deleteMovie, getMovieById, MovieRow } from "./movieRepository";
import { ApiError } from "@/lib/ApiError";

const addMovieSchema = z.object({
  movie_name: z.string().min(1),
  type: z.enum(["movie", "series"]),
  status: z.enum(["completed", "pending", "dropped"]),
  rating: z.number().min(0).max(10),
  watch_order_rank: z.number().int(),
  watch_link: z.string().nullable().optional(),
  tmdb_id: z.number(),
  genres: z.string(),
  release_year: z.number(),
  runtime: z.number(),
  language: z.string(),
  poster_url: z.string(),
  overview: z.string(),
});

const updateMovieSchema = z.object({
  status: z.enum(["completed", "pending", "dropped"]).optional(),
  rating: z.coerce.number().min(0).max(10).optional(),
  watch_order_rank: z.coerce.number().int().optional(),
  watch_link: z.string().nullable().optional(),
});

export async function getUserMoviesService(username: string) {
  return await getUserMovies(username);
}

export async function addMovieService(username: string, body: any) {
  const result = addMovieSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation error");
  }

  const movies = await getUserMovies(username);
  const exists = movies.some((m) => m.movie_name.toLowerCase() === result.data.movie_name.toLowerCase());
  
  if (exists) {
    throw new ApiError(409, "DUPLICATE_MOVIE", "Movie already exists in your library");
  }

  return await addMovie({
    ...result.data,
    watch_link: result.data.watch_link || null,
    username,
  });
}

export async function updateMovieService(id: number, username: string, body: any) {
  const movie = await getMovieById(id);
  if (!movie) {
    throw new ApiError(404, "NOT_FOUND", "Not found");
  }
  if (movie.username !== username) {
    throw new ApiError(403, "FORBIDDEN", "Forbidden");
  }

  const result = updateMovieSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation error");
  }

  return await updateMovie(id, result.data);
}

export async function deleteMovieService(id: number, username: string) {
  const movie = await getMovieById(id);
  if (!movie) {
    throw new ApiError(404, "NOT_FOUND", "Not found");
  }
  if (movie.username !== username) {
    throw new ApiError(403, "FORBIDDEN", "Forbidden");
  }

  await deleteMovie(id);
}
