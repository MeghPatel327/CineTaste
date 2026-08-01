import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getUserMoviesService } from "@/features/movies/movieService";
import { getTMDBDetails, getTMDBPosterUrl, extractTopCast, extractDirector, extractWriters, extractProductionCompanies, extractProductionCountries } from "@/features/movies/tmdbService";
import { getFilmIndustry } from "@/lib/utils";

export const GET = withLogger(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const params = await context.params;
  const tmdbId = parseInt(params.id, 10);
  if (isNaN(tmdbId)) return errorResponse("Invalid ID", 400, "BAD_REQUEST");

  const rawType = req.nextUrl.searchParams.get("type");
  const type = rawType === "series" || rawType === "tv" ? "tv" : "movie";

  try {
    const tmdbData = await getTMDBDetails(tmdbId, type);
    if (!tmdbData) return errorResponse("Not found", 404, "NOT_FOUND");

    const userMovies = await getUserMoviesService(session.username);
    const libraryMovie = userMovies.find(m => Number(m.tmdb_id) === tmdbId);

    const trailer = tmdbData.videos?.results?.find((v: any) => v.type === "Trailer" && v.site === "YouTube");
    
    const similarMovies = tmdbData.similar?.results?.slice(0, 10).map((s: any) => ({
      tmdb_id: s.id,
      title: s.title || s.name,
      poster_url: getTMDBPosterUrl(s.poster_path),
      release_year: s.release_date ? parseInt(s.release_date.split("-")[0], 10) : s.first_air_date ? parseInt(s.first_air_date.split("-")[0], 10) : 0,
    })) || [];

    const mappedData = {
      tmdb_id: tmdbData.id,
      title: tmdbData.title || tmdbData.name,
      original_title: tmdbData.original_title || tmdbData.original_name,
      overview: tmdbData.overview,
      poster_url: getTMDBPosterUrl(tmdbData.poster_path),
      backdrop_url: tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : null,
      genres: tmdbData.genres.map((g: any) => g.name).join(", "),
      release_year: tmdbData.release_date ? parseInt(tmdbData.release_date.split("-")[0], 10) : tmdbData.first_air_date ? parseInt(tmdbData.first_air_date.split("-")[0], 10) : 0,
      runtime: tmdbData.runtime || (tmdbData.episode_run_time && tmdbData.episode_run_time[0]) || 0,
      original_language: tmdbData.original_language,
      film_industry: getFilmIndustry(tmdbData),
      tagline: tmdbData.tagline,
      vote_average: tmdbData.vote_average ? parseFloat(tmdbData.vote_average.toFixed(1)) : 0,
      vote_count: tmdbData.vote_count || 0,
      cast: extractTopCast(tmdbData.credits, 15).map((c: any) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile_url: getTMDBPosterUrl(c.profile_path, "w185"),
      })),
      director: extractDirector(tmdbData.credits)?.name || null,
      writers: extractWriters(tmdbData.credits).map((w: any) => w.name),
      production_companies: extractProductionCompanies(tmdbData).map((p: any) => p.name),
      production_countries: extractProductionCountries(tmdbData).map((p: any) => p.name),
      trailer_key: trailer ? trailer.key : null,
      similar_movies: similarMovies,
      type: type === "tv" ? "series" : "movie",
      inLibrary: !!libraryMovie,
      libraryData: libraryMovie || null
    };

    return successResponse(mappedData);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "movies-tmdb-id");
