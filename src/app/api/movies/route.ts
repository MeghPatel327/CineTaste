import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getUserMoviesService, addMovieService } from "@/features/movies/movieService";
import { invalidateTasteProfile } from "@/features/recommendations/recommendationEngine";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const movies = await getUserMoviesService(session.username);
    return successResponse(movies);
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await req.json();
    const newMovie = await addMovieService(session.username, body);
    invalidateTasteProfile(session.username);
    return successResponse(newMovie, "Movie added successfully");
  } catch (error: any) {
    return handleApiError(error);
  }
}
