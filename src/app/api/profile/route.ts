import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { after } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getUserById } from "@/features/auth/userRepository";
import { getDashboardStatsService } from "@/features/dashboard/dashboardService";
import { getUserMovies } from "@/features/movies/movieRepository";
import { getRecommendationProfile } from "@/features/recommendations/recommendationProfileRepository";
import { generateProfileAsync } from "@/features/recommendations/profileGenerator";
import { generateTasteDna } from "@/features/profile/tasteDnaService";
import { getFilmIndustry } from "@/lib/utils";

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

    const [dashboardData, movies, profileRecord] = await Promise.all([
      getDashboardStatsService(session.username),
      getUserMovies(session.username),
      getRecommendationProfile(session.username),
    ]);

    // Automatically regenerate and upgrade any stale or legacy profiles in Baserow
    if (!profileRecord || profileRecord.engine_version !== "4.0") {
      after(() => {
        generateProfileAsync(session.username).catch(() => { });
      });
    }

    const tasteDna = generateTasteDna(movies, profileRecord);

    const favoriteGenre = tasteDna.favoriteGenres.length > 0
      ? tasteDna.favoriteGenres[0].name
      : dashboardData.favoriteGenres.length > 0
        ? dashboardData.favoriteGenres[0].name
        : "None";

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
      role: typeof user.role === "object" && user.role !== null ? (user.role as any).value : user.role,
      joinedAt: user.created_at,
      moviesWatched: dashboardData.stats.watched,
      totalMovies: dashboardData.stats.total,
      pendingCount: dashboardData.stats.pending,
      completionRate: dashboardData.stats.completionPercentage,
      avgRating: dashboardData.stats.avgRating,
      favoriteGenre,
      favoriteIndustry,
      favoriteGenres: tasteDna.favoriteGenres.length > 0 ? tasteDna.favoriteGenres : dashboardData.favoriteGenres,
      insights: dashboardData.insights,
      tasteDna: {
        summaryParagraph: tasteDna.summaryParagraph,
        strongLikes: tasteDna.strongLikes,
        strongDislikes: tasteDna.strongDislikes,
        storytellingStyles: tasteDna.storytellingStyles,
        preferredEras: tasteDna.preferredEras,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}, "profile");
