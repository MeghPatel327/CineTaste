import { MediaItem } from "@/types/media";
import {
  GeminiWeb2APIProvider,
  AlgorithmicFallbackProvider,
  UserTasteContext,
  RecommendedCandidate,
  RecommendationProvider,
} from "./gemini";
import { getServerEnv } from "./env";
import { getUserMediaRecords, findUserById, getAllBundledMedia, getWatchOptionsForMedia } from "./baserow";
import { searchMedia } from "./tmdb";

// User Recommendation cache
const userRecommendationCache = new Map<string, { items: MediaItem[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export async function getPersonalizedRecommendations(
  userId: string,
  forceRefresh = false
): Promise<{ items: MediaItem[]; engineUsed: string }> {
  // Check in-memory cache
  if (!forceRefresh) {
    const cached = userRecommendationCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { items: cached.items, engineUsed: "cached" };
    }
  }

  const [user, records] = await Promise.all([
    findUserById(userId),
    getUserMediaRecords(userId),
  ]);

  const bundled = getAllBundledMedia();
  const bundledMap = new Map(bundled.map((m) => [m.id, m]));

  const watchedTitles = records
    .filter((r) => r.libraryStatus === "completed" || r.libraryStatus === "watching" || (r.userRating && r.userRating >= 7))
    .map((r) => {
      const match = bundledMap.get(r.tmdbId);
      return {
        title: match ? match.title : r.tmdbId,
        rating: r.userRating,
        genres: match ? match.genres : [],
      };
    });

  const excludedTitles = records
    .filter((r) => r.isExcluded)
    .map((r) => {
      const match = bundledMap.get(r.tmdbId);
      return match ? match.title : r.tmdbId;
    });

  const context: UserTasteContext = {
    userId,
    watchedTitles,
    favoriteGenres: user?.preferredGenres || ["Sci-Fi", "Neo-Noir", "Mystery"],
    excludedTitles,
  };

  const config = getServerEnv();
  let provider: RecommendationProvider;
  let engineUsed = "algorithmic_fallback";

  if (config.ai.isConfigured) {
    provider = new GeminiWeb2APIProvider();
    engineUsed = `gemini_${config.ai.environment}`;
  } else {
    provider = new AlgorithmicFallbackProvider();
  }

  let candidates: RecommendedCandidate[] = [];
  try {
    candidates = await provider.generateRecommendations(context);
  } catch (err: any) {
    console.warn(`[CineTaste AI Recommendation] Primary provider failed: ${err.message}. Engaging Algorithmic fallback.`);
    const fallback = new AlgorithmicFallbackProvider();
    candidates = await fallback.generateRecommendations(context);
    engineUsed = "algorithmic_fallback";
  }

  // Resolve candidates to full MediaItems with Posters & Watch Options
  const resolvedItems: MediaItem[] = [];
  const seenIds = new Set<string>();

  for (const c of candidates) {
    // 1. Check bundled media
    let matchedItem = bundled.find(
      (m) => m.title.toLowerCase() === c.title.toLowerCase()
    );

    // 2. Search TMDB if not bundled
    if (!matchedItem) {
      const searchResults = await searchMedia(c.title);
      if (searchResults.length > 0) {
        matchedItem = searchResults[0];
      }
    }

    if (matchedItem && !seenIds.has(matchedItem.id)) {
      seenIds.add(matchedItem.id);
      const watchOptions = await getWatchOptionsForMedia(matchedItem.id);
      resolvedItems.push({
        ...matchedItem,
        recommendationReason: c.reason,
        watchOptions,
      });
    }
  }

  // Cold-start fallback if fewer than 3 items resolved
  if (resolvedItems.length < 3) {
    const coldStartBacklog = bundled.filter((b) => !seenIds.has(b.id)).slice(0, 5);
    for (const item of coldStartBacklog) {
      const watchOptions = await getWatchOptionsForMedia(item.id);
      resolvedItems.push({
        ...item,
        recommendationReason: item.recommendationReason || "Cinephile essential with high taste affinity",
        watchOptions,
      });
    }
  }

  userRecommendationCache.set(userId, {
    items: resolvedItems,
    timestamp: Date.now(),
  });

  return { items: resolvedItems, engineUsed };
}
