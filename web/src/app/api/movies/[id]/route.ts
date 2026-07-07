import { NextRequest } from "next/server";
import { z } from "zod";
import { getMovieById, updateMovie, deleteMovie } from "@/features/movies/movieRepository";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

const updateMovieSchema = z.object({
  status: z.enum(["completed", "pending", "dropped"]).optional(),
  rating: z.number().min(0).max(10).optional(),
  watch_order_rank: z.number().int().optional(),
  watch_link: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { id } = await params;
    const movieId = parseInt(id, 10);
    const movie = await getMovieById(movieId);

    if (!movie) return errorResponse("Not found", 404, "NOT_FOUND");
    if (movie.username !== session.username) return errorResponse("Forbidden", 403, "FORBIDDEN");

    const body = await req.json();
    const result = updateMovieSchema.safeParse(body);

    if (!result.success) {
      return errorResponse("Validation error", 400, "VALIDATION_ERROR");
    }

    const updatedMovie = await updateMovie(movieId, result.data);
    return successResponse(updatedMovie, "Movie updated successfully");
  } catch (error: any) {
    console.error("Update Movie Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { id } = await params;
    const movieId = parseInt(id, 10);
    const movie = await getMovieById(movieId);

    if (!movie) return errorResponse("Not found", 404, "NOT_FOUND");
    if (movie.username !== session.username) return errorResponse("Forbidden", 403, "FORBIDDEN");

    await deleteMovie(movieId);
    return successResponse(null, "Movie deleted successfully");
  } catch (error: any) {
    console.error("Delete Movie Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
