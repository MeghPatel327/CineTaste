import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getUserById } from "@/features/auth/userRepository";
import { getDashboardStatsService } from "@/features/dashboard/dashboardService";

export const GET = withLogger(async (req: NextRequest) => {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return errorResponse("User not found", 404, "USER_NOT_FOUND");
    }

    const dashboardData = await getDashboardStatsService(session.username);

    const favoriteGenre = dashboardData.favoriteGenres.length > 0 
      ? dashboardData.favoriteGenres[0].name 
      : "None";

    // Re-calculate favorite industry from user movies in dashboardService if we wanted, 
    // but let's just do a quick calculation here.
    const { getUserMovies } = await import("@/features/movies/movieRepository");
    const { getFilmIndustry } = await import("@/lib/utils");
    const movies = await getUserMovies(session.username);
    const industryCounts: Record<string, number> = {};
    
    movies.filter(m => m.rating > 0).forEach(m => {
      if (m.language) {
        const ind = getFilmIndustry(m.language);
        industryCounts[ind] = (industryCounts[ind] || 0) + 1;
      }
    });
    
    const favoriteIndustry = Object.entries(industryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    return successResponse({
      username: user.username,
      role: typeof user.role === 'object' && user.role !== null ? (user.role as any).value : user.role,
      joinedAt: user.created_at,
      moviesWatched: dashboardData.stats.watched,
      avgRating: dashboardData.stats.avgRating,
      favoriteGenre,
      favoriteIndustry
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}, "profile");
