import { ProfileStats } from "@/types/media";
import { getUserMediaRecords, getAllBundledMedia } from "./baserow";

export async function getUserProfileStats(userId: string): Promise<ProfileStats> {
  const records = await getUserMediaRecords(userId);
  const mediaMap = new Map(getAllBundledMedia().map((m) => [m.id, m]));

  let totalCompleted = 0;
  let totalInQueue = 0;
  let totalWatching = 0;
  let totalPlanToWatch = 0;
  let totalMinutes = 0;
  let sumRating = 0;
  let ratingCount = 0;

  const genreCounts: Record<string, number> = {};
  const ratingDistributionMap: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) ratingDistributionMap[i] = 0;

  const recentActivity: ProfileStats["recentActivity"] = [];

  for (const r of records) {
    const item = mediaMap.get(r.tmdbId);

    if (r.libraryStatus === "completed") {
      totalCompleted++;
      totalMinutes += 120; // estimate 2h per completed item
    } else if (r.libraryStatus === "watching") {
      totalWatching++;
      totalMinutes += Math.round(((r.watchProgress || 50) / 100) * 120);
    } else if (r.libraryStatus === "plan_to_watch") {
      totalPlanToWatch++;
    }

    if (r.isInQueue) {
      totalInQueue++;
    }

    if (r.userRating !== undefined && r.userRating > 0) {
      sumRating += r.userRating;
      ratingCount++;
      const roundedRating = Math.min(10, Math.max(1, Math.round(r.userRating)));
      ratingDistributionMap[roundedRating] = (ratingDistributionMap[roundedRating] || 0) + 1;
    }

    if (item) {
      item.genres.forEach((genre) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    }

    recentActivity.push({
      tmdbId: r.tmdbId,
      title: item ? item.title : r.tmdbId,
      action: r.libraryStatus !== "none" ? `Marked ${r.libraryStatus}` : r.isInQueue ? "Added to queue" : "Rated",
      date: r.updatedAt,
      rating: r.userRating,
      posterUrl: item?.posterUrl,
    });
  }

  // Calculate genre percentages
  const totalGenreEntries = Object.values(genreCounts).reduce((a, b) => a + b, 0) || 1;
  const genreBreakdown = Object.entries(genreCounts)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / totalGenreEntries) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const ratingDistribution = Object.entries(ratingDistributionMap).map(([rating, count]) => ({
    rating: Number(rating),
    count,
  }));

  // Sort recent activity descending
  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    totalCompleted,
    totalInQueue,
    totalWatching,
    totalPlanToWatch,
    totalHoursWatched: Math.round(totalMinutes / 60),
    averageUserRating: ratingCount > 0 ? Number((sumRating / ratingCount).toFixed(1)) : 8.8,
    genreBreakdown,
    ratingDistribution,
    recentActivity: recentActivity.slice(0, 8),
  };
}
