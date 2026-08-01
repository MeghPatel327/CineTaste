import { getUserMovies } from "@/features/movies/movieRepository";
import { generateRecommendations } from "@/features/recommendations/recommendationEngine";
import { getRecommendationProfile } from "@/features/recommendations/recommendationProfileRepository";
import { generateProfileAsync } from "@/features/recommendations/profileGenerator";

export async function getDashboardStatsService(username: string) {
  const profileRecord = await getRecommendationProfile(username);
  
  let dashboardCache: any = null;
  let favoriteGenres: { name: string; value: number }[] = [];

  if (profileRecord && profileRecord.generation_status === "Ready" && profileRecord.dashboard_cache) {
    try {
      dashboardCache = JSON.parse(profileRecord.dashboard_cache);
      const profileData = JSON.parse(profileRecord.recommendation_profile);
      
      const genreCounts = profileData.genres || {};
      favoriteGenres = Object.entries(genreCounts)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);
    } catch (e) {
      console.error("Failed to parse profile cache", e);
    }
  } else {
    // Fire off a background generation if it doesn't exist
    Promise.resolve().then(() => generateProfileAsync(username)).catch(console.error);
  }

  const movies = await getUserMovies(username);

  // If cache is missing, compute basic fallback stats
  if (!dashboardCache) {
    const total = movies.length;
    const watched = movies.filter(m => m.status === "completed").length;
    const pending = movies.filter(m => m.status === "pending").length;
    const completionPercentage = total > 0 ? Math.round((watched / total) * 100) : 0;
    
    const next5 = movies
      .filter(m => m.status === "pending")
      .sort((a, b) => (a.watch_order_rank || Infinity) - (b.watch_order_rank || Infinity))
      .slice(0, 5);

    dashboardCache = {
      stats: { total, watched, pending, completionPercentage },
      next5,
      insights: []
    };
    
    // Basic genres fallback
    const genreCountsFallback: Record<string, number> = {};
    movies.forEach(m => {
      let genres: string[] = [];
      try { genres = JSON.parse(m.genres); } catch { genres = m.genres ? m.genres.split(",") : []; }
      genres.forEach(g => {
        genreCountsFallback[g] = (genreCountsFallback[g] || 0) + 1;
      });
    });
    favoriteGenres = Object.entries(genreCountsFallback)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }

  // Get 3 recommendation previews (now uses cached profile natively)
  const recommendations = await generateRecommendations(username, { allMovies: movies });
  const recommendationPreview = recommendations.slice(0, 3);

  return {
    ...dashboardCache,
    favoriteGenres,
    recommendationPreview,
  };
}
