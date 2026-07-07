import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { generateRecommendations, getUserTopGenres } from "@/features/recommendations/recommendationEngine";
import { getUserMoviesService } from "@/features/movies/movieService";
import { env } from "@/lib/env";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Genre ID mapping for TMDB
const GENRE_NAME_TO_ID: Record<string, number> = {
  "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35, "Crime": 80,
  "Documentary": 99, "Drama": 18, "Family": 10751, "Fantasy": 14, "History": 36,
  "Horror": 27, "Music": 10402, "Mystery": 9648, "Romance": 10749, "Science Fiction": 878,
  "Thriller": 53, "War": 10752, "Western": 37,
};

async function tmdbFetch(path: string): Promise<any> {
  try {
    const res = await fetch(`${TMDB_BASE_URL}${path}${path.includes("?") ? "&" : "?"}api_key=${env.TMDB_API_KEY}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    // Fetch everything in parallel
    const [
      userMovies,
      allRecs,
      topGenres,
      trendingData,
      popularMoviesData,
      popularSeriesData,
      nowPlayingData,
      onTheAirData,
    ] = await Promise.all([
      getUserMoviesService(session.username),
      generateRecommendations(session.username),
      getUserTopGenres(session.username),
      tmdbFetch("/trending/all/day"),
      tmdbFetch("/movie/popular"),
      tmdbFetch("/tv/popular"),
      tmdbFetch("/movie/now_playing"),
      tmdbFetch("/tv/on_the_air"),
    ]);

    const libraryIds = new Set(userMovies.map(m => m.tmdb_id));

    // Top Picks - best recommendations
    const topPicks = allRecs.slice(0, 10);

    // Genre-based sections - top 3 genres
    const genreSections: { genre: string; items: any[] }[] = [];
    const usedIds = new Set(topPicks.map(r => r.movieId));

    for (const genre of topGenres.slice(0, 3)) {
      const genreId = GENRE_NAME_TO_ID[genre];
      if (!genreId) continue;

      // Fetch genre-specific movies from TMDB
      const genreData = await tmdbFetch(`/discover/movie?with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100`);
      const items = (genreData?.results || [])
        .filter((m: any) => !libraryIds.has(m.id) && !usedIds.has(m.id))
        .slice(0, 10)
        .map((m: any) => ({
          id: m.id,
          title: m.title || m.name,
          poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
          media_type: m.media_type || "movie",
          release_year: parseInt((m.release_date || m.first_air_date || "0").split("-")[0], 10) || 0,
          vote_average: m.vote_average || 0,
        }));
      
      items.forEach((i: any) => usedIds.add(i.id));
      if (items.length > 0) genreSections.push({ genre, items });
    }

    // Movies only recs
    const recommendedMovies = allRecs.filter(r => r.media_type === "movie" || !r.media_type).slice(0, 10);

    // Series only recs
    const recommendedSeries = allRecs.filter(r => r.media_type === "tv").slice(0, 10);

    // Hidden Gems: lower popularity but high score
    const hiddenGems = allRecs
      .filter(r => (r.vote_average || 0) >= 7 && (r.vote_average || 0) <= 8.5)
      .slice(0, 10);

    // Format TMDB results
    const formatTmdb = (items: any[]) => (items || [])
      .filter((m: any) => !libraryIds.has(m.id))
      .slice(0, 15)
      .map((m: any) => ({
      id: m.id,
      title: m.title || m.name,
      poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      media_type: m.media_type || (m.first_air_date ? "tv" : "movie"),
      release_year: parseInt((m.release_date || m.first_air_date || "0").split("-")[0], 10) || 0,
      vote_average: m.vote_average || 0,
    }));

    const trending = formatTmdb(trendingData?.results);
    const popularMovies = formatTmdb(popularMoviesData?.results);
    const popularSeries = formatTmdb(popularSeriesData?.results);
    const recentlyReleased = [
      ...formatTmdb(nowPlayingData?.results),
      ...formatTmdb(onTheAirData?.results),
    ].sort((a, b) => b.release_year - a.release_year).slice(0, 15);

    return successResponse({
      topPicks,
      genreSections,
      recommendedMovies,
      recommendedSeries,
      hiddenGems,
      trending,
      popularMovies,
      popularSeries,
      recentlyReleased,
      userGenres: topGenres.slice(0, 5),
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
