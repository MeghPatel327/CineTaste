import { z } from "zod";
import { getUserMovies, addMovie, updateMovie, deleteMovie, getMovieById, MovieRow } from "./movieRepository";
import { ApiError } from "@/lib/ApiError";
import { getNextWatchOrderRank, handleStatusChange } from "./queueService";

const addMovieSchema = z.object({
  movie_name: z.string().min(1),
  type: z.enum(["movie", "series"]),
  status: z.enum(["completed", "pending", "dropped"]),
  rating: z.number().min(0).max(10),
  watch_order_rank: z.number().int().optional(), // No longer required
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

  // Determine watch_order_rank based on status
  let watchOrderRank: number | null = null;
  if (result.data.status === "pending") {
    // Auto-assign next watch order position
    watchOrderRank = await getNextWatchOrderRank(username);
  }
  // For completed or dropped, watch_order_rank remains null

  return await addMovie({
    ...result.data,
    watch_order_rank: watchOrderRank,
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

  // Apply the data change FIRST so the movie's new status is committed to the
  // database before any queue-renumbering logic runs.  Previously the order was
  // reversed: handleStatusChange → renumberQueue would still see this movie as
  // "pending" (old status) and assign it rank 1, then updateMovie would stamp
  // status = "completed" but leave watch_order_rank = 1 in the row.
  const updatedMovie = await updateMovie(id, result.data);

  // Now handle queue changes — the DB already reflects the new status so
  // getPendingQueue / renumberQueue will see the correct picture.
  if (result.data.status && result.data.status !== movie.status) {
    await handleStatusChange(id, username, movie.status, result.data.status);
  }

  return updatedMovie;
}

export async function deleteMovieService(id: number, username: string) {
  const movie = await getMovieById(id);
  if (!movie) {
    throw new ApiError(404, "NOT_FOUND", "Not found");
  }
  if (movie.username !== username) {
    throw new ApiError(403, "FORBIDDEN", "Forbidden");
  }

  // If the movie was pending, repair the queue after deletion:
  // shift all higher-ranked pending movies down by one to close the gap.
  if (movie.status === "pending" && movie.watch_order_rank) {
    const deletedRank = movie.watch_order_rank;
    await deleteMovie(id);
    // Now shift all remaining pending movies that were ranked below the deleted one
    const remaining = await getUserMovies(username);
    const below = remaining.filter(
      (m) => m.status === "pending" && (m.watch_order_rank ?? 0) > deletedRank
    );
    await Promise.all(
      below.map((m) =>
        updateMovie(m.id, { watch_order_rank: (m.watch_order_rank ?? 0) - 1 })
      )
    );
  } else {
    await deleteMovie(id);
  }
}
