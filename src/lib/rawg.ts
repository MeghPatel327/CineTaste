import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { GameItem, GameDetails, GameFilterOptions } from "@/features/games/gameTypes";
import { CURATED_GAMES } from "@/features/games/curatedGames";

const BASE = "https://api.rawg.io/api";

// ─── Platform slug mapping ────────────────────────────────────────────────────
// RAWG platform IDs for filter param
const PLATFORM_ID_MAP: Record<string, number> = {
  "PC": 4,
  "PlayStation 5": 187,
  "PlayStation 4": 18,
  "Xbox Series X|S": 186,
  "Xbox One": 1,
  "Nintendo Switch": 7,
  "Mobile": 3,
};

// RAWG genre slugs
export const GENRE_SLUG_MAP: Record<string, string> = {
  "Action": "action",
  "Adventure": "adventure",
  "Role-playing (RPG)": "role-playing-games-rpg",
  "RPG": "role-playing-games-rpg",
  "Shooter": "shooter",
  "Strategy": "strategy",
  "Platform": "platformer",
  "Platformer": "platformer",
  "Indie": "indie",
  "Puzzle": "puzzle",
  "Racing": "racing",
  "Simulation": "simulation",
  "Simulator": "simulation",
  "Sports": "sports",
  "Sport": "sports",
  "Fighting": "fighting",
  "Arcade": "arcade",
  "Casual": "casual",
  "Massively Multiplayer (MMO)": "massively-multiplayer",
  "MMO": "massively-multiplayer",
  "Family": "family",
  "Board Games": "board-games",
  "Card": "card",
  "Educational": "educational",
};

// RAWG ordering map
export const SORT_MAP: Record<string, string> = {
  recommended: "-rating",
  rating: "-rating",
  rating_desc: "-rating",
  popularity: "-added",
  year: "-released",
  release_desc: "-released",
  "year-asc": "released",
  release_asc: "released",
  title: "name",
  name_asc: "name",
  "title-desc": "-name",
  name_desc: "-name",
};

function key(): string {
  return env.RAWG_API_KEY;
}

function hasKey(): boolean {
  return Boolean(env.RAWG_API_KEY);
}

// ── In-Memory LRU Cache with TTL ─────────────────────────────────────────────
const BROWSE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DETAILS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const browseCache = new Map<string, CacheEntry<{ items: GameItem[]; total: number }>>();
const detailsCache = new Map<number, CacheEntry<GameDetails | null>>();
const searchCache = new Map<string, CacheEntry<GameItem[]>>();

function setCache<T>(map: Map<any, CacheEntry<T>>, key: any, data: T, ttlMs: number) {
  if (map.size > 300) {
    const iter = map.keys();
    for (let i = 0; i < 50; i++) {
      const next = iter.next();
      if (next.done) break;
      map.delete(next.value);
    }
  }
  map.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function getCache<T>(map: Map<any, CacheEntry<T>>, key: any): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return null;
  }
  return entry.data;
}

/** Fetch with a strict timeout so slow external API calls never hang the server */
async function fetchWithTimeout(url: string, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

/** Build RAWG URL with API key appended */
function rawgUrl(path: string, params: Record<string, string | number | undefined> = {}): string {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("key", key());
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/** Normalize RAWG cover image — returns the URL as-is (RAWG serves direct CDN URLs) */
export function normalizeRawgImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = url.trim();
  if (!s) return null;
  // Some RAWG media thumbs have /media/crop/600/400/ — upgrade to full size
  return s.replace(/\/media\/crop\/\d+\/\d+\//, "/media/");
}

/**
 * Map a single RAWG game object (from list or detail endpoint) → GameItem
 */
export function formatRawgGame(raw: any): GameItem {
  const releaseYear = raw.released
    ? parseInt(raw.released.substring(0, 4), 10)
    : undefined;

  const genres: string[] = (raw.genres || [])
    .map((g: any) => {
      // Map RAWG genre slug/name back to our canonical genre names
      const entry = Object.entries(GENRE_SLUG_MAP).find(
        ([, slug]) => slug === g.slug || g.name?.toLowerCase() === slug
      );
      return entry ? entry[0] : g.name;
    })
    .filter(Boolean);

  const platforms: string[] = (raw.platforms || [])
    .map((p: any) => {
      const rawName: string = p.platform?.name || "";
      // Map to our canonical platform names when possible
      const entry = Object.entries(PLATFORM_ID_MAP).find(
        ([, id]) => id === p.platform?.id
      );
      return entry ? entry[0] : rawName;
    })
    .filter(Boolean);

  // RAWG rating is 0-5; convert to 0-10 scale
  // Metacritic is 0-100; scale to 0-10 with 1 decimal place (e.g. 92 -> 9.2)
  let rating: number | undefined;
  if (raw.metacritic !== undefined && raw.metacritic !== null && raw.metacritic > 0) {
    rating = parseFloat(Math.min(10, raw.metacritic / 10).toFixed(1));
  } else if (raw.rating !== undefined && raw.rating !== null && raw.rating > 0) {
    rating = parseFloat((raw.rating * 2).toFixed(1));
  }
  
  // Detect adult/hentai/18+ content (strictly scoped to explicit nudity/hentai/adult sexual content)
  // Mainstream action/dark-fantasy games (e.g. Sekiro, Witcher 3, Elden Ring, GTA) with ESRB Mature 17+ (id: 4)
  // or Teen/Everyone ratings are NEVER classified as 18+ adult games.
  const esrbId = raw.esrb_rating?.id;
  const isMainstreamEsrb = esrbId !== undefined && esrbId !== null && esrbId <= 4; // 1: E, 2: E10+, 3: T, 4: M (17+)

  const rawgTags = (raw.tags || []).map((t: any) => t.name?.toLowerCase() || "").filter(Boolean);
  
  // Scoped strictly to explicit nudity/hentai/sexual adult content
  const explicitAdultPatterns = [
    /\bhentai\b/i,
    /\beroge\b/i,
    /\bdoujin\b/i,
    /\bnsfw\b/i,
    /\bporn\b/i,
    /\berotic\b/i,
    /\berotica\b/i,
    /\badults? only\b/i,
    /\bexplicit sexual\b/i,
  ];

  const hasExplicitAdultTag = rawgTags.some((tag: string) =>
    explicitAdultPatterns.some((pattern) => pattern.test(tag))
  );

  const isAdult = Boolean(
    !isMainstreamEsrb && (
      esrbId === 5 || // Adults Only 18+ in ESRB
      hasExplicitAdultTag
    )
  );

  if (isAdult && !genres.includes("18+")) {
    genres.push("18+");
  }

  const developers: string[] = (raw.developers || []).map((d: any) => d.name).filter(Boolean);
  const publishers: string[] = (raw.publishers || []).map((p: any) => p.name).filter(Boolean);

  return {
    id: raw.id,
    title: raw.name,
    cover_url: normalizeRawgImageUrl(raw.background_image),
    backdrop_url: normalizeRawgImageUrl(raw.background_image_additional || raw.background_image),
    release_year: releaseYear,
    release_date: raw.released || undefined,
    rating,
    rawg_rating: raw.rating,
    rating_count: raw.ratings_count || raw.reviews_count || 0,
    score: raw.metacritic ? Math.round(raw.metacritic / 10) : undefined,
    genres,
    platforms,
    game_modes: [], // RAWG doesn't expose game modes in API
    themes: (raw.tags || []).slice(0, 5).map((t: any) => t.name).filter(Boolean),
    isAdult,
    developer: developers[0] || null,
    developers,
    publisher: publishers[0] || null,
    publishers,
    summary: raw.description_raw || raw.description || "",
    url: raw.website || undefined,
    inLibrary: false,
    libraryStatus: null,
  };
}

/**
 * Map RAWG game detail + screenshots → GameDetails
 */
export function formatRawgGameDetail(raw: any, screenshots: any[]): GameDetails {
  const base = formatRawgGame(raw);
  const screenshotUrls: string[] = screenshots
    .map((s: any) => normalizeRawgImageUrl(s.image))
    .filter((u): u is string => Boolean(u));

  return {
    ...base,
    screenshots: screenshotUrls,
    artworks: [],
    similar_games: (raw.game_series || []).slice(0, 5).map((g: any) => ({
      id: g.id,
      title: g.name,
      cover_url: normalizeRawgImageUrl(g.background_image),
      release_year: g.released ? parseInt(g.released.substring(0, 4), 10) : undefined,
    })),
  };
}

/**
 * Search RAWG games by text query
 */
export async function searchRawgGames(query: string, limit = 15): Promise<GameItem[]> {
  if (!query.trim()) return [];

  const cacheKey = `${query.toLowerCase().trim()}|${limit}`;
  const cached = getCache(searchCache, cacheKey);
  if (cached) return cached;

  if (!hasKey()) {
    const q = query.toLowerCase();
    const fallback = CURATED_GAMES.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.genres.some((gen) => gen.toLowerCase().includes(q))
    ).slice(0, limit);
    setCache(searchCache, cacheKey, fallback, SEARCH_CACHE_TTL_MS);
    return fallback;
  }

  try {
    const url = rawgUrl("/games", {
      search: query,
      page_size: limit,
      search_precise: "true",
    });
    const res = await fetchWithTimeout(url, 3500);
    if (!res.ok) throw new Error(`RAWG search ${res.status}`);
    const data = await res.json();
    const results = (data.results || []).map(formatRawgGame);
    setCache(searchCache, cacheKey, results, SEARCH_CACHE_TTL_MS);
    return results;
  } catch (err) {
    logger.warn({ module: "rawg", action: "SEARCH_FAILED", error: err });
    const q = query.toLowerCase();
    const fallback = CURATED_GAMES.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.genres.some((gen) => gen.toLowerCase().includes(q))
    ).slice(0, limit);
    return fallback;
  }
}

/**
 * Get detailed info for a single RAWG game by ID
 */
export async function getRawgGameDetails(gameId: number): Promise<GameDetails | null> {
  const cached = getCache(detailsCache, gameId);
  if (cached !== null) return cached;

  if (!hasKey()) {
    const curated = CURATED_GAMES.find((g) => g.id === gameId);
    if (!curated) return null;
    const fallback = {
      ...curated,
      screenshots: [],
      artworks: [],
      similar_games: [],
    } as GameDetails;
    setCache(detailsCache, gameId, fallback, DETAILS_CACHE_TTL_MS);
    return fallback;
  }

  try {
    const [detailRes, screenshotRes] = await Promise.all([
      fetchWithTimeout(rawgUrl(`/games/${gameId}`), 3500),
      fetchWithTimeout(rawgUrl(`/games/${gameId}/screenshots`), 3500).catch(() => null),
    ]);

    if (!detailRes.ok) {
      if (detailRes.status === 404) return null;
      throw new Error(`RAWG detail ${detailRes.status}`);
    }

    const detail = await detailRes.json();
    const screenshots = screenshotRes && screenshotRes.ok ? (await screenshotRes.json()).results || [] : [];

    const result = formatRawgGameDetail(detail, screenshots);
    setCache(detailsCache, gameId, result, DETAILS_CACHE_TTL_MS);
    return result;
  } catch (err) {
    logger.warn({ module: "rawg", action: "DETAIL_FAILED", gameId, error: err });
    const curated = CURATED_GAMES.find((g) => g.id === gameId);
    if (!curated) return null;
    return { ...curated, screenshots: [], artworks: [], similar_games: [] } as GameDetails;
  }
}

/**
 * Browse / discover games with filters
 */
export async function browseRawgGames(
  options: GameFilterOptions = {}
): Promise<{ items: GameItem[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 50;

  const cacheKey = JSON.stringify({
    page,
    limit,
    query: options.query,
    genres: (options.genres || []).slice().sort(),
    platforms: (options.platforms || []).slice().sort(),
    gameModes: (options.gameModes || []).slice().sort(),
    era: options.era,
    sort: options.sort,
    includeAdult: options.includeAdult,
    rating: options.rating,
  });

  const cached = getCache(browseCache, cacheKey);
  if (cached) return cached;

  if (hasKey()) {
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        page_size: Math.min(limit, 40), // RAWG max page_size is 40
      };

      if (options.query && options.query.trim()) {
        params.search = options.query.trim();
        // If user is searching, use search relevance unless explicit sort requested
        if (options.sort && options.sort !== "recommended") {
          params.ordering = SORT_MAP[options.sort];
        }
      } else {
        params.ordering = SORT_MAP[options.sort || "recommended"] || "-rating";
      }

      // Check for 18+/adult selection
      const wantsAdult = Boolean(
        options.includeAdult ||
        options.genres?.some((g) => g.includes("18+") || g.toLowerCase().includes("adult"))
      );

      if (wantsAdult) {
        options.includeAdult = true;
        params.tags = "hentai,eroge,nsfw,erotic";
      }

      // Genre filter (excluding 18+ tag which is passed via tags)
      if (options.genres && options.genres.length > 0) {
        const cleanGenres = options.genres.filter(
          (g) => !g.includes("18+") && !g.toLowerCase().includes("adult")
        );
        const slugs = cleanGenres
          .map((g) => GENRE_SLUG_MAP[g] || GENRE_SLUG_MAP[g.replace(/\s*\(.*\)/, "")] || g.toLowerCase())
          .filter(Boolean);
        if (slugs.length > 0) params.genres = slugs.join(",");
      }

      // Platform filter
      if (options.platforms && options.platforms.length > 0) {
        const ids = options.platforms
          .map((p) => PLATFORM_ID_MAP[p])
          .filter(Boolean);
        if (ids.length > 0) params.platforms = ids.join(",");
      }

      // Era filter via dates
      if (options.era) {
        const eraRanges: Record<string, [string, string]> = {
          "2020s": ["2020-01-01", "2029-12-31"],
          "2010s": ["2010-01-01", "2019-12-31"],
          "2000s": ["2000-01-01", "2009-12-31"],
          "1990s": ["1990-01-01", "1999-12-31"],
          Classic: ["1958-01-01", "1989-12-31"],
        };
        const range = eraRanges[options.era];
        if (range) params.dates = `${range[0]},${range[1]}`;
      }

      const url = rawgUrl("/games", params);
      const res = await fetchWithTimeout(url, 3500);

      if (!res.ok) throw new Error(`RAWG browse ${res.status}`);
      const data = await res.json();

      let items: GameItem[] = (data.results || []).map(formatRawgGame);

      // Post-filter for adult content
      if (!options.includeAdult) {
        items = items.filter((item) => !item.isAdult);
      } else if (options.genres?.some((g) => g.includes("18+"))) {
        items = items.filter((item) => item.isAdult);
      }

      // Post-filter by minimum rating
      if (options.rating !== undefined && options.rating !== null && options.rating > 0) {
        items = items.filter((item) => (item.rating || 0) >= options.rating!);
      }

      // Post-filter game_modes (not supported in RAWG API query params)
      if (options.gameModes && options.gameModes.length > 0) {
        // RAWG doesn't expose modes — skip filter, include all
      }

      const result = { items, total: data.count || items.length };
      setCache(browseCache, cacheKey, result, BROWSE_CACHE_TTL_MS);
      return result;
    } catch (err) {
      logger.warn({ module: "rawg", action: "BROWSE_FAILED", error: err });
      // Fall through to curated
    }
  }

  // ─── Curated fallback ──────────────────────────────────────────────────────
  let filtered = [...CURATED_GAMES];

  const wantsAdultFallback = Boolean(
    options.includeAdult ||
    options.genres?.some((g) => g.includes("18+") || g.toLowerCase().includes("adult"))
  );

  if (options.query) {
    const q = options.query.toLowerCase();
    filtered = filtered.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.genres.some((gen) => gen.toLowerCase().includes(q)) ||
        (g.developer && g.developer.toLowerCase().includes(q))
    );
  }

  if (options.genres && options.genres.length > 0) {
    const cleanGenres = options.genres.filter(
      (g) => !g.includes("18+") && !g.toLowerCase().includes("adult")
    );
    if (cleanGenres.length > 0) {
      filtered = filtered.filter((g) =>
        cleanGenres.some((gen) =>
          g.genres.some((ig) => ig.toLowerCase().includes(gen.toLowerCase()) || gen.toLowerCase().includes(ig.toLowerCase()))
        )
      );
    }
  }

  if (options.platforms && options.platforms.length > 0) {
    filtered = filtered.filter((g) =>
      options.platforms!.some((plat) =>
        g.platforms.some((ip) => ip.toLowerCase().includes(plat.toLowerCase()))
      )
    );
  }

  if (options.gameModes && options.gameModes.length > 0) {
    filtered = filtered.filter((g) =>
      options.gameModes!.some((m) =>
        g.game_modes.some((im) => im.toLowerCase() === m.toLowerCase())
      )
    );
  }

  if (options.era) {
    filtered = filtered.filter((g) => {
      const year = g.release_year;
      if (!year) return false;
      if (options.era === "2020s") return year >= 2020;
      if (options.era === "2010s") return year >= 2010 && year <= 2019;
      if (options.era === "2000s") return year >= 2000 && year <= 2009;
      if (options.era === "1990s") return year >= 1990 && year <= 1999;
      if (options.era === "Classic") return year < 1990;
      return true;
    });
  }

  filtered.sort((a, b) => {
    if (options.sort === "rating") return (b.rating || 0) - (a.rating || 0);
    if (options.sort === "popularity") return (b.rating_count || 0) - (a.rating_count || 0);
    if (options.sort === "year") return (b.release_year || 0) - (a.release_year || 0);
    if (options.sort === "year-asc") return (a.release_year || 0) - (b.release_year || 0);
    if (options.sort === "title") return a.title.localeCompare(b.title);
    if (options.sort === "title-desc") return b.title.localeCompare(a.title);
    return (b.score || 0) - (a.score || 0);
  });

  // Filter out adult content by default unless explicitly requested
  if (!options.includeAdult && !wantsAdultFallback) {
    filtered = filtered.filter((g) => !(g as any).isAdult);
  } else if (options.genres?.some((g) => g.includes("18+"))) {
    filtered = filtered.filter((g) => Boolean((g as any).isAdult));
  }

  // Filter by minimum rating
  if (options.rating !== undefined && options.rating !== null && options.rating > 0) {
    filtered = filtered.filter((g) => (g.rating || 0) >= options.rating!);
  }

  const offset = (page - 1) * limit;
  const paged = filtered.slice(offset, offset + limit);
  return { items: paged, total: filtered.length };
}

