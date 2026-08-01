import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { updateMovieService, deleteMovieService } from "@/features/movies/movieService";

export const PATCH = withLogger(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { id } = await params;
    const movieId = parseInt(id, 10);
    const body = await req.json();
    const updatedMovie = await updateMovieService(movieId, session.username, body);
    return successResponse(updatedMovie, "Movie updated successfully");
  } catch (error: any) {
    return handleApiError(error);
  }
}, "movies-id");

export const DELETE = withLogger(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { id } = await params;
    const movieId = parseInt(id, 10);
    await deleteMovieService(movieId, session.username);
    return successResponse(null, "Movie deleted successfully");
  } catch (error: any) {
    return handleApiError(error);
  }
}, "movies-id");
