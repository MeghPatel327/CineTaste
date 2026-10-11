import { getUserMovies } from "@/features/movies/movieRepository";
import { generateRecommendations } from "@/features/recommendations/recommendationEngine";
import { getRecommendationProfile } from "@/features/recommendations/recommendationProfileRepository";
import { generateProfileAsync } from "@/features/recommendations/profileGenerator";
import { after } from "next/server";
import { logger } from "@/lib/logger";

export async function getDashboardStatsService(username: string) {
  const start = Date.now();
  logger.info({ module: "dashboardService", action: "FETCH_DASHBOARD", status: "STARTED", message: `Fetching dashboard for ${username}` });
  
  const movies = await getUserMovies(username);

  // ── Basic Stats (always computed from live data for accuracy) ──
  const total = movies.length;
  const watched = movies.filter(m => m.status === "completed").length;
  const pending = movies.filter(m => m.status === "pending").length;
  const completionPercentage = total > 0 ? Math.round((watched / total) * 100) : 0;

  const ratedMovies = movies.filter(m => m.rating > 0);
  const avgRating = ratedMovies.length > 0
    ? parseFloat((ratedMovies.reduce((acc, m) => acc + Number(m.rating || 0), 0) / ratedMovies.length).toFixed(1))
    : 0;

  const next5 = movies
    .filter(m => m.status === "pending")
    .sort((a, b) => (a.watch_order_rank || Infinity) - (b.watch_order_rank || Infinity))
    .slice(0, 5);

  // ── Insights (reuse Recommendation Profile when available) ──
  const profileRecord = await getRecommendationProfile(username);
  const insights: { title: string; value: string; description: string }[] = [];
  let favoriteGenres: { name: string; value: number }[] = [];

  if (profileRecord) {
    // Parse favorite genres from the profile
    try {
      const genres: Record<string, number> = JSON.parse(profileRecord.favorite_genres || "{}");
      const sorted = Object.entries(genres).sort((a, b) => b[1] - a[1]);

      favoriteGenres = sorted.slice(0, 7).map(([name, value]) => ({ name, value }));

      if (sorted.length > 0) {
        insights.push({ title: "Favorite Genre", value: sorted[0][0], description: "Based on your ratings" });
      }
    } catch { /* skip */ }

    // Favorite era
    try {
      const eras: Record<string, number> = JSON.parse(profileRecord.favorite_eras || "{}");
      const sorted = Object.entries(eras).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        insights.push({ title: "Favorite Era", value: `${sorted[0][0]} Cinema`, description: "Most rated decade" });
      }
    } catch { /* skip */ }

    // Favorite director
    try {
      const directors: Record<string, number> = JSON.parse(profileRecord.favorite_directors || "{}");
      const sorted = Object.entries(directors).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        insights.push({ title: "Top Director", value: sorted[0][0], description: "Director you rate highest" });
      }
    } catch { /* skip */ }

    // Favorite industry
    try {
      const industries: Record<string, number> = JSON.parse(profileRecord.favorite_industries || "{}");
      const sorted = Object.entries(industries).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        insights.push({ title: "Top Industry", value: sorted[0][0], description: "Your preferred film industry" });
      }
    } catch (err: any) {
      logger.warn({ module: "dashboardService", action: "PARSE_PROFILE", status: "FAILED", error: err, message: "Failed to parse profile insights" });
    }
  } else {
    // No profile yet — trigger background generation
    logger.info({ module: "dashboardService", action: "TRIGGER_PROFILE_GEN", status: "STARTED", message: "No profile found, triggering background generation" });
    after(() => { generateProfileAsync(username).catch((err) => logger.error({ module: "dashboardService", action: "GENERATE_PROFILE", status: "FAILED", error: err })); });

    // Fallback genre computation from live data
    const genreCounts: Record<string, number> = {};
    movies.forEach(m => {
      let genres: string[] = [];
      try { genres = JSON.parse(m.genres); } catch { genres = m.genres ? m.genres.split(",") : []; }
      genres.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    favoriteGenres = Object.entries(genreCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }

  // Always add average rating as an insight
  insights.push({ title: "Average Rating", value: avgRating.toString(), description: "Your overall taste" });

  // Get 3 recommendation previews
  const recommendations = await generateRecommendations(username, { allMovies: movies });
  const recommendationPreview = recommendations.slice(0, 3);
  
  logger.info({ module: "dashboardService", action: "FETCH_DASHBOARD", status: "SUCCESS", durationMs: Date.now() - start, message: `Dashboard loaded for ${username}` });

  return {
    stats: {
      total,
      watched,
      pending,
      completionPercentage,
      avgRating,
    },
    next5,
    favoriteGenres,
    insights,
    recommendationPreview,
  };
}
