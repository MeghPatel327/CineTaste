import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { withLogger } from "@/lib/apiWrapper";
import { getUserMoviesService, addMovieService } from "@/features/movies/movieService";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const movies = await getUserMoviesService(session.username);
    return successResponse(movies);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "movies-list");

export const POST = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await req.json();
    const newMovie = await addMovieService(session.username, body);
    return successResponse(newMovie, "Movie added successfully");
  } catch (error: any) {
    return handleApiError(error);
  }
}, "movies-add");
