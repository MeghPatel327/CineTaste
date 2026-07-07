import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getUserMoviesService } from "@/features/movies/movieService";
import { getTMDBDetails, getTMDBPosterUrl } from "@/features/movies/tmdbService";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const params = await context.params;
  const tmdbId = parseInt(params.id, 10);
  if (isNaN(tmdbId)) return errorResponse("Invalid ID", 400, "BAD_REQUEST");

  const type = req.nextUrl.searchParams.get("type") as "movie" | "tv" || "movie";

  try {
    const tmdbData = await getTMDBDetails(tmdbId, type);
    if (!tmdbData) return errorResponse("Not found", 404, "NOT_FOUND");

    const userMovies = await getUserMoviesService(session.username);
    const libraryMovie = userMovies.find(m => m.tmdb_id === tmdbId);

    const mappedData = {
      tmdb_id: tmdbData.id,
      title: tmdbData.title || tmdbData.name,
      overview: tmdbData.overview,
      poster_url: getTMDBPosterUrl(tmdbData.poster_path),
      genres: tmdbData.genres.map((g: any) => g.name).join(", "),
      release_year: tmdbData.release_date ? parseInt(tmdbData.release_date.split("-")[0], 10) : tmdbData.first_air_date ? parseInt(tmdbData.first_air_date.split("-")[0], 10) : 0,
      runtime: tmdbData.runtime || (tmdbData.episode_run_time && tmdbData.episode_run_time[0]) || 0,
      original_language: tmdbData.original_language,
      type: type === "tv" ? "series" : "movie",
      inLibrary: !!libraryMovie,
      libraryData: libraryMovie || null
    };

    return successResponse(mappedData);
  } catch (error: any) {
    return handleApiError(error);
  }
}
