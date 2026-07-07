import { NextRequest } from "next/server";
import { getUserMovies } from "@/features/movies/movieRepository";
import { generateRecommendations } from "@/features/recommendations/recommendationEngine";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const movies = await getUserMovies(session.username);
    
    const total = movies.length;
    const watched = movies.filter(m => m.status === "completed").length;
    const pending = movies.filter(m => m.status === "pending").length;
    const completionPercentage = total > 0 ? Math.round((watched / total) * 100) : 0;
    
    const ratedMovies = movies.filter(m => m.rating > 0);
    const avgRating = ratedMovies.length > 0 ? (ratedMovies.reduce((acc, m) => acc + m.rating, 0) / ratedMovies.length).toFixed(1) : 0;

    const next5 = movies
      .filter(m => m.status === "pending")
      .sort((a, b) => (a.watch_order_rank || Infinity) - (b.watch_order_rank || Infinity))
      .slice(0, 5);

    // Genre Distribution
    const genreCounts: Record<string, number> = {};
    movies.forEach(m => {
      let genres: string[] = [];
      try { genres = JSON.parse(m.genres); } catch { genres = m.genres ? m.genres.split(",") : []; }
      genres.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });

    const favoriteGenres = Object.entries(genreCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Get 3 recommendation previews
    const recommendations = await generateRecommendations(session.username);
    const recommendationPreview = recommendations.slice(0, 3);

    return successResponse({
      stats: {
        total,
        watched,
        pending,
        completionPercentage,
        avgRating,
      },
      next5,
      favoriteGenres,
      recommendationPreview,
    });
  } catch (error: any) {
    console.error("Dashboard Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
