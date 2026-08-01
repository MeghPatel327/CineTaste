import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { addMovie, getUserMovies } from "@/features/movies/movieRepository";
import { invalidateTasteProfile, FEEDBACK_TAG } from "@/features/recommendations/recommendationEngine";
import { env } from "@/lib/env";
import { baserowDelete } from "@/lib/baserow";

const TMDB = "https://api.themoviedb.org/3";

async function tmdbGet(path: string) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${TMDB}${path}${sep}api_key=${env.TMDB_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

/**
 * POST /api/recommendations/feedback
 * body: { tmdbId: number, type: "movie" | "tv", action: "interested" | "not_interested" }
 *
 * Feedback signals are stored as synthetic rows in the movies table with:
 *   status = "dropped"
 *   watch_link = "__FEEDBACK__"
 *   rating = -2 (Interested) | -1 (Not Interested)
 *
 * This allows the recommendation engine to use them naturally through the
 * existing RATING_WEIGHTS system without any schema changes.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await req.json();
    const { tmdbId, type, action } = body as {
      tmdbId: number;
      type: "movie" | "tv";
      action: "interested" | "not_interested";
    };

    if (!tmdbId || !type || !action) {
      return errorResponse("Missing required fields", 400, "VALIDATION_ERROR");
    }

    const username = session.username;

    // Check if a feedback row already exists for this movie
    const allMovies = await getUserMovies(username);
    const existingFeedback = allMovies.find(
      m => m.tmdb_id === tmdbId && m.watch_link === FEEDBACK_TAG
    );

    // If user re-clicks the same action, treat as toggle (remove feedback)
    if (existingFeedback) {
      const existingRating = existingFeedback.rating;
      const newRating = action === "interested" ? -2 : -1;
      if (existingRating === newRating) {
        // Toggle off — delete the feedback row
        await baserowDelete(env.BASEROW_MOVIES_TABLE_ID, existingFeedback.id);
        invalidateTasteProfile(username);
        return successResponse({ removed: true }, "Feedback removed");
      }
      // Otherwise update to new action — handled by delete + re-create below
      await baserowDelete(env.BASEROW_MOVIES_TABLE_ID, existingFeedback.id);
    }

    // Fetch basic TMDB details to store genres etc.
    const tmdbType = type === "tv" ? "tv" : "movie";
    const detail = await tmdbGet(`/${tmdbType}/${tmdbId}`);

    const genreIds: number[] = detail?.genre_ids || detail?.genres?.map((g: any) => g.id) || [];
    const TMDB_GENRES: Record<number, string> = {
      28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",
      99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",
      27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Science Fiction",
      10770:"TV Movie",53:"Thriller",10752:"War",37:"Western",
      10759:"Action & Adventure",10762:"Kids",10765:"Sci-Fi & Fantasy",
    };
    const genres = JSON.stringify(genreIds.map((id: number) => TMDB_GENRES[id]).filter(Boolean));
    const title = detail?.title || detail?.name || `Movie ${tmdbId}`;
    const releaseDate = detail?.release_date || detail?.first_air_date || "";
    const releaseYear = releaseDate ? parseInt(releaseDate.split("-")[0], 10) : 0;
    const runtime = detail?.runtime || detail?.episode_run_time?.[0] || 0;
    const language = detail?.original_language || "en";
    const posterPath = detail?.poster_path;
    const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : "";
    const overview = detail?.overview || "";

    const rating = action === "interested" ? -2 : -1;
    const now = new Date().toISOString();

    await addMovie({
      username,
      movie_name: title,
      type: type === "tv" ? "series" : "movie",
      status: "dropped",
      rating,
      watch_order_rank: null,
      watch_link: FEEDBACK_TAG,
      tmdb_id: tmdbId,
      genres,
      release_year: releaseYear,
      runtime,
      language,
      poster_url: posterUrl,
      overview,
    });

    // Invalidate caches so next recommendation fetch reflects new feedback
    invalidateTasteProfile(username);

    return successResponse({ success: true, action }, "Feedback saved");
  } catch (error: any) {
    return handleApiError(error);
  }
}
