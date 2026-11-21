import { z } from "zod";
import { getUserGames, addGame, updateGame, deleteGame } from "./gameRepository";
import { browseIgdbGames, getIgdbGameDetails, searchIgdbGames } from "@/lib/igdb";
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
  "Role-playing (RPG)",
  "Adventure",
  "Shooter",
  "Hack and slash",
  "Platform",
  "Puzzle",
  "Strategy",
  "Indie",
  "Racing",
  "Turn-based strategy (TBS)",
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
    igdb_id: z.number(),
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
    id: g.igdb_id,
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
 * Browse games catalog with user library integration
 */
export async function getGameBrowseService(
  username: string,
  options: GameFilterOptions = {}
): Promise<GameBrowseResult> {
  const [userGames, browseData] = await Promise.all([
    getUserGames(username).catch(() => []),
    browseIgdbGames(options),
  ]);

  const libraryMap = new Map<number, { status: GameStatus; rating: number }>();
  userGames.forEach((g) => {
    libraryMap.set(g.igdb_id, { status: g.status, rating: g.rating });
  });

  const enrichedItems: GameItem[] = browseData.items.map((item) => {
    const inLib = libraryMap.get(item.id);
    return {
      ...item,
      inLibrary: Boolean(inLib),
      libraryStatus: inLib ? inLib.status : null,
      userRating: inLib ? inLib.rating : undefined,
    };
  });

  const featuredSpotlight = enrichedItems.length > 0 ? enrichedItems[0] : null;

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
 * Get detailed game info by IGDB ID
 */
export async function getGameDetailsService(
  username: string,
  gameId: number
): Promise<GameDetails | null> {
  const [details, userGames] = await Promise.all([
    getIgdbGameDetails(gameId),
    getUserGames(username).catch(() => []),
  ]);

  if (!details) return null;

  const libraryItem = userGames.find((g) => g.igdb_id === gameId);

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
  };
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
    (g) => g.igdb_id === result.data.igdb_id || g.game_name.toLowerCase() === result.data.game_name.toLowerCase()
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
    igdb_id: result.data.igdb_id,
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
 * Search IGDB games (re-export for API route use)
 */
export { searchIgdbGames };
