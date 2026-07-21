import { MovieRow, getUserMovies, updateMovie } from "./movieRepository";
import { ApiError } from "@/lib/ApiError";

/**
 * Get all pending movies ordered by watch_order_rank
 */
export async function getPendingQueue(username: string): Promise<MovieRow[]> {
  const movies = await getUserMovies(username);
  return movies
    .filter((m) => m.status === "pending")
    .sort((a, b) => (a.watch_order_rank || 0) - (b.watch_order_rank || 0));
}

/**
 * Renumber a queue to ensure continuous sequence (1, 2, 3...)
 * This function ensures no gaps and all pending movies have unique ranks
 */
export async function renumberQueue(username: string): Promise<void> {
  const pending = await getPendingQueue(username);
  
  for (let i = 0; i < pending.length; i++) {
    const expectedRank = i + 1;
    if (pending[i].watch_order_rank !== expectedRank) {
      await updateMovie(pending[i].id, {
        watch_order_rank: expectedRank,
      });
    }
  }
}

/**
 * Move a movie up in the queue (swap with previous)
 * Returns the updated movie
 */
export async function moveMovieUp(movieId: number, username: string): Promise<MovieRow> {
  const movies = await getUserMovies(username);
  const movie = movies.find((m) => m.id === movieId);
  
  if (!movie) {
    throw new ApiError(404, "NOT_FOUND", "Movie not found");
  }
  
  if (movie.status !== "pending") {
    throw new ApiError(400, "INVALID_STATUS", "Only pending movies can be moved");
  }
  
  const pending = await getPendingQueue(username);
  const currentIndex = pending.findIndex((m) => m.id === movieId);
  
  if (currentIndex <= 0) {
    throw new ApiError(400, "ALREADY_FIRST", "Movie is already at the top of the queue");
  }
  
  const previousMovie = pending[currentIndex - 1];
  const currentRank = movie.watch_order_rank || 0;
  const previousRank = previousMovie.watch_order_rank || 0;
  
  // Swap ranks
  await updateMovie(previousMovie.id, { watch_order_rank: currentRank });
  await updateMovie(movieId, { watch_order_rank: previousRank });
  
  // Fetch and return updated movie
  const updated = await getUserMovies(username);
  const result = updated.find((m) => m.id === movieId);
  if (!result) throw new ApiError(500, "INTERNAL_ERROR", "Failed to update movie");
  
  return result;
}

/**
 * Move a movie down in the queue (swap with next)
 * Returns the updated movie
 */
export async function moveMovieDown(movieId: number, username: string): Promise<MovieRow> {
  const movies = await getUserMovies(username);
  const movie = movies.find((m) => m.id === movieId);
  
  if (!movie) {
    throw new ApiError(404, "NOT_FOUND", "Movie not found");
  }
  
  if (movie.status !== "pending") {
    throw new ApiError(400, "INVALID_STATUS", "Only pending movies can be moved");
  }
  
  const pending = await getPendingQueue(username);
  const currentIndex = pending.findIndex((m) => m.id === movieId);
  
  if (currentIndex >= pending.length - 1) {
    throw new ApiError(400, "ALREADY_LAST", "Movie is already at the bottom of the queue");
  }
  
  const nextMovie = pending[currentIndex + 1];
  const currentRank = movie.watch_order_rank || 0;
  const nextRank = nextMovie.watch_order_rank || 0;
  
  // Swap ranks
  await updateMovie(nextMovie.id, { watch_order_rank: currentRank });
  await updateMovie(movieId, { watch_order_rank: nextRank });
  
  // Fetch and return updated movie
  const updated = await getUserMovies(username);
  const result = updated.find((m) => m.id === movieId);
  if (!result) throw new ApiError(500, "INTERNAL_ERROR", "Failed to update movie");
  
  return result;
}

/**
 * Get the next watch order rank (max + 1) or 1 if queue is empty
 */
export async function getNextWatchOrderRank(username: string): Promise<number> {
  const pending = await getPendingQueue(username);
  if (pending.length === 0) return 1;
  const maxRank = Math.max(...pending.map((m) => m.watch_order_rank || 0));
  return maxRank + 1;
}

/**
 * Handle status change: update queue accordingly
 * - Pending → Completed: remove from queue (set rank to NULL), renumber
 * - Pending → Dropped: remove from queue (set rank to NULL), renumber
 * - Completed/Dropped → Pending: append to end of queue
 * - Other transitions: no queue changes
 */
export async function handleStatusChange(
  movieId: number,
  username: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  if (oldStatus === newStatus) return;
  
  const movies = await getUserMovies(username);
  const movie = movies.find((m) => m.id === movieId);
  if (!movie) return;
  
  // Pending → Completed or Pending → Dropped: Remove from queue and renumber
  if (oldStatus === "pending" && (newStatus === "completed" || newStatus === "dropped")) {
    await updateMovie(movieId, { watch_order_rank: null as any });
    await renumberQueue(username);
  }
  
  // Completed/Dropped → Pending: Append to end of queue
  if ((oldStatus === "completed" || oldStatus === "dropped") && newStatus === "pending") {
    const nextRank = await getNextWatchOrderRank(username);
    await updateMovie(movieId, { watch_order_rank: nextRank });
  }
  
  // Completed → Dropped or Dropped → Completed: No queue change
}

/**
 * Migrate existing data: ensure all pending movies have unique sequential ranks
 * Completed/Dropped movies should have NULL ranks
 * This should be called once when the feature is introduced
 */
export async function migrateQueueData(username: string): Promise<{ fixed: number }> {
  const movies = await getUserMovies(username);
  let fixed = 0;
  
  // First pass: set non-pending movies to NULL
  for (const movie of movies) {
    if ((movie.status === "completed" || movie.status === "dropped") && movie.watch_order_rank) {
      await updateMovie(movie.id, { watch_order_rank: null as any });
      fixed++;
    }
  }
  
  // Second pass: renumber pending movies
  const pending = await getPendingQueue(username);
  for (let i = 0; i < pending.length; i++) {
    const expectedRank = i + 1;
    if ((pending[i].watch_order_rank || 0) !== expectedRank) {
      await updateMovie(pending[i].id, { watch_order_rank: expectedRank });
      fixed++;
    }
  }
  
  return { fixed };
}
