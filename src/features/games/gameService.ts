import { z } from "zod";
import { getUserGames, addGame, updateGame, deleteGame } from "./gameRepository";
import { browseRawgGames, getRawgGameDetails, searchRawgGames } from "@/lib/rawg";
import type {
  GameItem,
  GameDetails,
  GameFilterOptions,
  GameBrowseResult,
  GameDashboardStats,
  GameStatus,
} from "./gameTypes";
import type { GameRow } from "./gameRepository";
import { ApiError } from "@/lib/ApiError";
import { logger } from "@/lib/logger";

export const AVAILABLE_GAME_GENRES = [
  "Action",
  "Adventure",
  "Role-playing (RPG)",
  "Shooter",
  "Strategy",
  "Platform",
  "Indie",
  "Puzzle",
  "Racing",
  "Simulation",
  "Sports",
  "Fighting",
  "Arcade",
  "Casual",
  "Massively Multiplayer (MMO)",
  "Family",
  "Card",
  "18+ (Adult / Mature)",
];

export const AVAILABLE_GAME_PLATFORMS = [
  "PC",
  "PlayStation 5",
  "PlayStation 4",
  "Xbox Series X|S",
  "Xbox One",
  "Nintendo Switch",
  "Mobile",
];

export const AVAILABLE_GAME_MODES = ["Single-player", "Multiplayer", "Co-op"];

export const AVAILABLE_GAME_ERAS = ["2020s", "2010s", "2000s", "1990s", "Classic"];

const addGameSchema = z
  .object({
    game_name: z.string().optional(),
    title: z.string().optional(),
    rawg_id: z.number(),
    status: z.enum(["playing", "completed", "pending", "on_hold", "dropped"]),
    rating: z.number().min(0).max(10).optional().default(0),
    personal_review: z.string().optional().default(""),
    genres: z.union([z.string(), z.array(z.string())]).optional().default("[]"),
    platforms: z.union([z.string(), z.array(z.string())]).optional().default("[]"),
    release_year: z.number().optional().default(0),
    cover_url: z.string().optional().default(""),
    backdrop_url: z.string().optional().default(""),
    summary: z.string().optional().default(""),
    playtime_hours: z.number().optional().default(0),
  })
  .transform((data) => ({
    ...data,
    game_name: data.game_name || data.title || "Untitled Game",
    genres: typeof data.genres === "string" ? data.genres : JSON.stringify(data.genres || []),
    platforms: typeof data.platforms === "string" ? data.platforms : JSON.stringify(data.platforms || []),
  }));

const updateGameSchema = z.object({
  status: z.enum(["playing", "completed", "pending", "on_hold", "dropped"]).optional(),
  rating: z.coerce.number().min(0).max(10).optional(),
  personal_review: z.string().optional(),
  playtime_hours: z.coerce.number().min(0).optional(),
});

/** Map a GameRow from Baserow to a GameItem for the frontend. */
function rowToGameItem(g: GameRow): GameItem {
  const parsePlatforms = (): string[] => {
    try { return JSON.parse(g.platforms); } catch { return g.platforms ? g.platforms.split(",") : []; }
  };
  const parseGenres = (): string[] => {
    try { return JSON.parse(g.genres); } catch { return g.genres ? g.genres.split(",") : []; }
  };
  return {
    id: g.rawg_id,
    title: g.game_name,
    cover_url: g.cover_url || null,
    backdrop_url: g.backdrop_url || null,
    release_year: g.release_year,
    rating: g.rating,
    genres: parseGenres(),
    platforms: parsePlatforms(),
    game_modes: [],
    themes: [],
    summary: g.summary,
    inLibrary: true,
    libraryStatus: g.status,
    status: g.status,
    userRating: g.rating,
    userReview: g.personal_review,
    playtime_hours: g.playtime_hours,
    libraryData: {
      id: g.id,
      status: g.status,
      rating: g.rating,
      playtime_hours: g.playtime_hours,
      personal_review: g.personal_review,
    },
  };
}

/**
 * Search games with user library integration, guaranteeing already-logged library
 * games (including "completed", "playing", "pending", etc.) are included in the results.
 */
export async function searchGamesService(
  username: string,
  query: string,
  limit = 15
): Promise<GameItem[]> {
  if (!query.trim()) return [];

  const [rawResults, userGames] = await Promise.all([
    searchRawgGames(query, limit),
    getUserGames(username).catch(() => []),
  ]);

  const libraryMap = new Map<number, GameRow>();
  const titleMap = new Map<string, GameRow>();

  userGames.forEach((g) => {
    if (g.rawg_id) libraryMap.set(Number(g.rawg_id), g);
    if (g.id) libraryMap.set(Number(g.id), g);
    if (g.game_name) {
      titleMap.set(g.game_name.toLowerCase().replace(/[^a-z0-9]/g, ""), g);
    }
  });

  // Find any user library games matching query
  const qClean = query.toLowerCase().trim();
  const qNorm = qClean.replace(/[^a-z0-9]/g, "");
  const matchingUserGames = userGames.filter((g) => {
    const name = g.game_name.toLowerCase();
    return name.includes(qClean) || name.replace(/[^a-z0-9]/g, "").includes(qNorm);
  });

  const seenIds = new Set<number>();
  const combined: GameItem[] = [];

  // 1. Include matching user library games (including "completed")
  for (const ug of matchingUserGames) {
    const item = rowToGameItem(ug);
    combined.push(item);
    if (ug.rawg_id) seenIds.add(Number(ug.rawg_id));
    if (ug.id) seenIds.add(Number(ug.id));
  }

  // 2. Include RAWG search results, enriched with user's library status if tracked
  for (const item of rawResults) {
    if (seenIds.has(Number(item.id))) continue;
    seenIds.add(Number(item.id));

    const normTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const libMatch = libraryMap.get(Number(item.id)) || titleMap.get(normTitle);

    if (libMatch) {
      combined.push({
        ...item,
        inLibrary: true,
        libraryStatus: libMatch.status,
        status: libMatch.status,
        userRating: libMatch.rating,
        userReview: libMatch.personal_review,
        playtime_hours: libMatch.playtime_hours,
        libraryData: {
          id: libMatch.id,
          status: libMatch.status,
          rating: libMatch.rating,
          playtime_hours: libMatch.playtime_hours,
          personal_review: libMatch.personal_review,
        },
      });
    } else {
      combined.push(item);
    }
  }

  return combined.slice(0, limit);
}

/**
 * Browse games catalog with user library integration
 */
export async function getGameBrowseService(
  username: string,
  options: GameFilterOptions = {}
): Promise<GameBrowseResult> {
  const [userGames, browseData] = await Promise.all([
    getUserGames(username).catch(() => []),
    browseRawgGames(options),
  ]);

  const libraryMap = new Map<number, GameRow>();
  const titleMap = new Map<string, GameRow>();

  userGames.forEach((g) => {
    if (g.rawg_id) libraryMap.set(Number(g.rawg_id), g);
    if (g.id) libraryMap.set(Number(g.id), g);
    if (g.game_name) {
      titleMap.set(g.game_name.toLowerCase().replace(/[^a-z0-9]/g, ""), g);
    }
  });

  let enrichedItems: GameItem[] = browseData.items.map((item) => {
    const normTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const libMatch = libraryMap.get(Number(item.id)) || titleMap.get(normTitle);
    return {
      ...item,
      inLibrary: Boolean(libMatch),
      libraryStatus: libMatch ? libMatch.status : null,
      status: libMatch ? libMatch.status : item.status,
      userRating: libMatch ? libMatch.rating : undefined,
    };
  });

  // When searching, guarantee that already-logged games (including "completed")
  // appear in search results even if RAWG search ranking differs
  if (options.query && options.query.trim()) {
    const qClean = options.query.toLowerCase().trim();
    const qNorm = qClean.replace(/[^a-z0-9]/g, "");
    const existingIds = new Set(enrichedItems.map((item) => Number(item.id)));

    for (const ug of userGames) {
      const gName = ug.game_name.toLowerCase();
      const gNorm = gName.replace(/[^a-z0-9]/g, "");
      if (
        (gName.includes(qClean) || gNorm.includes(qNorm)) &&
        !existingIds.has(Number(ug.rawg_id))
      ) {
        enrichedItems.unshift(rowToGameItem(ug));
        existingIds.add(Number(ug.rawg_id));
      }
    }
  }

  const featuredSpotlight = selectSpotlight(enrichedItems);

  return {
    items: enrichedItems,
    games: enrichedItems,
    total: browseData.total,
    page: options.page || 1,
    pageSize: options.limit || 50,
    hasMore: (options.page || 1) * (options.limit || 50) < browseData.total,
    availableGenres: AVAILABLE_GAME_GENRES,
    availablePlatforms: AVAILABLE_GAME_PLATFORMS,
    availableEras: AVAILABLE_GAME_ERAS,
    availableGameModes: AVAILABLE_GAME_MODES,
    featuredSpotlight,
  };
}

/**
 * Select a non-adult spotlight game with valid artwork
 */
function selectSpotlight(items: GameItem[]): GameItem | null {
  // Prefer games with valid cover_url and backdrop_url
  const validSpotlight = items.find(
    (g) => !g.isAdult && g.cover_url && g.backdrop_url
  );
  return validSpotlight || items.find((g) => !g.isAdult && g.cover_url) || items[0] || null;
}

/**
 * Generates personalized game recommendations based on user library & taste profile,
 * strictly excluding any games already in the user's library.
 */
export async function getGameRecommendationsService(
  username: string,
  options: { limit?: number; forceRefresh?: boolean } = {}
): Promise<GameItem[]> {
  const limit = options.limit || 12;
  const userGames = await getUserGames(username).catch(() => []);

  // Strict library exclusion sets
  const userGameIds = new Set<number>();
  const userTitles = new Set<string>();

  for (const g of userGames) {
    if (g.rawg_id) userGameIds.add(Number(g.rawg_id));
    if (g.id) userGameIds.add(Number(g.id));
    if (g.game_name) {
      userTitles.add(g.game_name.toLowerCase().replace(/[^a-z0-9]/g, ""));
    }
  }

  // Build taste profile
  const genreWeights: Record<string, number> = {};
  const platformWeights: Record<string, number> = {};
  const negativeGenres = new Set<string>();

  for (const game of userGames) {
    let parsedGenres: string[] = [];
    try {
      parsedGenres = JSON.parse(game.genres);
    } catch {
      parsedGenres = game.genres ? game.genres.split(",") : [];
    }

    let parsedPlatforms: string[] = [];
    try {
      parsedPlatforms = JSON.parse(game.platforms);
    } catch {
      parsedPlatforms = game.platforms ? game.platforms.split(",") : [];
    }

    if (game.status === "dropped" || (game.rating > 0 && game.rating <= 4)) {
      parsedGenres.forEach((gen) => negativeGenres.add(gen.trim()));
      continue;
    }

    const weight = game.rating >= 8 ? 3 : game.status === "completed" ? 2 : 1;
    for (const gen of parsedGenres) {
      const clean = gen.trim();
      if (clean) genreWeights[clean] = (genreWeights[clean] || 0) + weight;
    }
    for (const plat of parsedPlatforms) {
      const clean = plat.trim();
      if (clean) platformWeights[clean] = (platformWeights[clean] || 0) + weight;
    }
  }

  const topGenres = Object.entries(genreWeights)
    .sort((a, b) => b[1] - a[1])
    .map(([gen]) => gen);

  const topPlatforms = Object.entries(platformWeights)
    .sort((a, b) => b[1] - a[1])
    .map(([plat]) => plat);

  // Fetch candidates: top rated games in favorite genres or trending acclaimed
  let candidates: GameItem[] = [];

  if (topGenres.length > 0) {
    const genreCandidates = await browseRawgGames({
      genres: topGenres.slice(0, 2),
      platforms: topPlatforms.slice(0, 2),
      sort: "rating",
      limit: 40,
    });
    candidates = genreCandidates.items;
  }

  // If not enough candidates or cold start, fetch top acclaimed must-play games
  if (candidates.length < 20) {
    const fallbackAcclaimed = await browseRawgGames({
      sort: "rating",
      limit: 40,
    });
    const existingIds = new Set(candidates.map((c) => c.id));
    for (const item of fallbackAcclaimed.items) {
      if (!existingIds.has(item.id)) {
        candidates.push(item);
        existingIds.add(item.id);
      }
    }
  }

  // STRICT EXCLUSION:
  // Remove any game that matches an ID or normalized title already in user's library (including "completed" games)
  const excludedCandidates = candidates.filter((g) => {
    if (userGameIds.has(Number(g.id))) return false;
    const normTitle = g.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (userTitles.has(normTitle)) return false;
    for (const ut of userTitles) {
      if (ut.length >= 5 && (normTitle.includes(ut) || ut.includes(normTitle))) {
        return false;
      }
    }
    return true;
  });

  // Calculate Match Score Affinity
  const scored = excludedCandidates.map((g) => {
    let score = 75; // Baseline high recommendation confidence

    // Genre overlap bonus
    if (topGenres.length > 0 && g.genres) {
      const matchingGenreCount = g.genres.filter((gen) =>
        topGenres.includes(gen)
      ).length;
      score += Math.min(15, matchingGenreCount * 6);
    }

    // Platform affinity bonus
    if (topPlatforms.length > 0 && g.platforms) {
      const matchingPlat = g.platforms.some((plat) =>
        topPlatforms.some((tp) => plat.toLowerCase().includes(tp.toLowerCase()))
      );
      if (matchingPlat) score += 5;
    }

    // Quality bonus
    if (g.rating && g.rating >= 9) score += 3;

    // Disliked genre penalty
    if (g.genres?.some((gen) => negativeGenres.has(gen))) {
      score -= 15;
    }

    // Clamp score between 70 and 99
    const finalScore = Math.min(99, Math.max(70, Math.round(score)));

    return {
      ...g,
      score: finalScore,
    };
  });

  // Sort by affinity score descending, then rating
  scored.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.rating || 0) - (a.rating || 0));

  return scored.slice(0, limit);
}

/**
 * Get detailed game info by RAWG ID
 */
export async function getGameDetailsService(
  username: string,
  gameId: number
): Promise<GameDetails | null> {
  const [details, userGames] = await Promise.all([
    getRawgGameDetails(gameId),
    getUserGames(username).catch(() => []),
  ]);

  if (!details) return null;

  const libraryItem = userGames.find((g) => g.rawg_id === gameId);

  return {
    ...details,
    inLibrary: Boolean(libraryItem),
    libraryStatus: libraryItem ? libraryItem.status : null,
    status: libraryItem?.status,
    userRating: libraryItem?.rating,
    userReview: libraryItem?.personal_review,
    libraryData: libraryItem
      ? {
          id: libraryItem.id,
          status: libraryItem.status,
          rating: libraryItem.rating,
          playtime_hours: libraryItem.playtime_hours || 0,
          personal_review: libraryItem.personal_review,
        }
      : null,
  };
}

/**
 * Computes analytics and metrics for the Game Dashboard
 */
export async function getGameDashboardStatsService(username: string): Promise<GameDashboardStats> {
  const games = await getUserGames(username).catch(() => []);

  const total = games.length;
  const completed = games.filter((g) => g.status === "completed").length;
  const playing = games.filter((g) => g.status === "playing").length;
  const onHold = games.filter((g) => g.status === "on_hold").length;
  const dropped = games.filter((g) => g.status === "dropped").length;
  const pending = games.filter((g) => g.status === "pending").length;

  const rated = games.filter((g) => g.rating > 0);
  const avgRating =
    rated.length > 0
      ? parseFloat((rated.reduce((acc, g) => acc + Number(g.rating), 0) / rated.length).toFixed(1))
      : 0;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Platform Breakdown
  const platformCounts: Record<string, number> = {};
  games.forEach((g) => {
    let plats: string[] = [];
    try { plats = JSON.parse(g.platforms); } catch { plats = g.platforms ? g.platforms.split(",") : []; }
    plats.forEach((p) => { const c = p.trim(); if (c) platformCounts[c] = (platformCounts[c] || 0) + 1; });
  });

  const topPlatforms = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Genre Breakdown
  const genreCounts: Record<string, number> = {};
  games.forEach((g) => {
    let gens: string[] = [];
    try { gens = JSON.parse(g.genres); } catch { gens = g.genres ? g.genres.split(",") : []; }
    gens.forEach((gen) => { const c = gen.trim(); if (c) genreCounts[c] = (genreCounts[c] || 0) + 1; });
  });

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  // Up Next: backlog
  const nextUp: GameItem[] = games.filter((g) => g.status === "pending").slice(0, 5).map(rowToGameItem);

  // Recent activity
  const recentActivity: GameItem[] = games
    .slice()
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
    .slice(0, 6)
    .map(rowToGameItem);

  const totalPlaytimeHours = games.reduce((acc, g) => acc + (Number(g.playtime_hours) || 0), 0);

  // Discovery feed: personalized recommendations strictly excluding all user library titles (including completed)
  const discovery = await getGameRecommendationsService(username, { limit: 6 }).catch(() => []);

  return {
    total,
    totalGames: total,
    playing,
    completed,
    pending,
    backlog: pending,
    onHold,
    dropped,
    avgRating,
    completionRate,
    totalPlaytimeHours,
    topGenres: topGenres.map((g) => ({ ...g, genre: g.name, count: g.value })),
    topPlatforms: topPlatforms.map((p) => ({ ...p, platform: p.name, count: p.value })),
    nextUp,
    nextUpBacklog: nextUp,
    recentActivity,
    recentlyUpdated: recentActivity,
    discovery,
    suggestions: discovery,
    // If library is empty, show trending games as fallback (still strictly excluding user library)
    trending: total === 0 ? await getTrendingGames(username) : [],
  };
}

/**
 * Get trending games for display when user's library is empty
 */
async function getTrendingGames(username?: string): Promise<GameItem[]> {
  try {
    const trending = await browseRawgGames({ limit: 12, sort: "rating" });
    let items = trending.items.filter((g) => !g.isAdult);
    if (username) {
      const userGames = await getUserGames(username).catch(() => []);
      const userGameIds = new Set<number>();
      const userTitles = new Set<string>();
      for (const g of userGames) {
        if (g.rawg_id) userGameIds.add(Number(g.rawg_id));
        if (g.id) userGameIds.add(Number(g.id));
        if (g.game_name) userTitles.add(g.game_name.toLowerCase().replace(/[^a-z0-9]/g, ""));
      }
      items = items.filter((g) => {
        if (userGameIds.has(Number(g.id))) return false;
        const normTitle = g.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (userTitles.has(normTitle)) return false;
        return true;
      });
    }
    return items;
  } catch {
    return [];
  }
}

/**
 * Add game to user library
 */
export async function addGameToLibraryService(username: string, body: any) {
  const result = addGameSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid game payload");
  }

  const existing = await getUserGames(username);
  const duplicate = existing.some(
    (g) => g.rawg_id === result.data.rawg_id || g.game_name.toLowerCase() === result.data.game_name.toLowerCase()
  );

  if (duplicate) {
    throw new ApiError(409, "DUPLICATE_GAME", "Game already exists in your library");
  }

  const row = await addGame({
    username,
    game_name: result.data.game_name,
    status: result.data.status,
    rating: result.data.rating || 0,
    personal_review: result.data.personal_review || "",
    watch_order_rank: result.data.status === "pending" ? existing.length + 1 : null,
    rawg_id: result.data.rawg_id,
    genres: result.data.genres,
    platforms: result.data.platforms,
    release_year: result.data.release_year || 0,
    playtime_hours: result.data.playtime_hours || 0,
    cover_url: result.data.cover_url,
    backdrop_url: result.data.backdrop_url,
    summary: result.data.summary,
  });

  logger.info({ module: "gameService", action: "ADD_GAME", username, title: result.data.game_name });

  return row;
}

/**
 * Update game in user library
 */
export async function updateGameLibraryItemService(username: string, id: number, body: any) {
  const result = updateGameSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid game update payload");
  }

  const updates: Partial<GameRow> = {};
  if (result.data.status !== undefined) updates.status = result.data.status;
  if (result.data.rating !== undefined) updates.rating = result.data.rating;
  if (result.data.personal_review !== undefined) updates.personal_review = result.data.personal_review;
  if (result.data.playtime_hours !== undefined) updates.playtime_hours = result.data.playtime_hours;

  return await updateGame(id, updates);
}

/**
 * Remove game from user library
 */
export async function removeGameFromLibraryService(username: string, id: number) {
  return await deleteGame(id);
}

/**
 * Search RAWG games (re-export for API route use)
 */
export { searchRawgGames };
