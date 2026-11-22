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
  
  // Detect adult/hentai/18+ content
  const adultTags = ["adult", "sexual", "violence", "nudity", "explicit", "nsfw", "erotic"];
  const rawgTags = (raw.tags || []).map((t: any) => t.name?.toLowerCase() || "").filter(Boolean);
  const isAdult = Boolean(
    raw.esrb_rating?.id === 5 || // Adults Only 18+ in ESRB
    rawgTags.some((tag: string) => 
      adultTags.includes(tag) || 
      tag.includes("18+") || 
      tag.includes("hentai") || 
      tag.includes("erot") ||
      tag.includes("adult")
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

  if (!hasKey()) {
    const q = query.toLowerCase();
    return CURATED_GAMES.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.genres.some((gen) => gen.toLowerCase().includes(q))
    ).slice(0, limit);
  }

  try {
    const url = rawgUrl("/games", {
      search: query,
      page_size: limit,
      search_precise: "true",
    });
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`RAWG search ${res.status}`);
    const data = await res.json();
    return (data.results || []).map(formatRawgGame);
  } catch (err) {
    logger.warn({ module: "rawg", action: "SEARCH_FAILED", error: err });
    const q = query.toLowerCase();
    return CURATED_GAMES.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.genres.some((gen) => gen.toLowerCase().includes(q))
    ).slice(0, limit);
  }
}

/**
 * Get detailed info for a single RAWG game by ID
 */
export async function getRawgGameDetails(gameId: number): Promise<GameDetails | null> {
  if (!hasKey()) {
    const curated = CURATED_GAMES.find((g) => g.id === gameId);
    if (!curated) return null;
    return {
      ...curated,
      screenshots: [],
      artworks: [],
      similar_games: [],
    } as GameDetails;
  }

  try {
    const [detailRes, screenshotRes] = await Promise.all([
      fetch(rawgUrl(`/games/${gameId}`), { cache: "no-store" }),
      fetch(rawgUrl(`/games/${gameId}/screenshots`), { cache: "no-store" }),
    ]);

    if (!detailRes.ok) {
      if (detailRes.status === 404) return null;
      throw new Error(`RAWG detail ${detailRes.status}`);
    }

    const detail = await detailRes.json();
    const screenshots = screenshotRes.ok ? (await screenshotRes.json()).results || [] : [];

    return formatRawgGameDetail(detail, screenshots);
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
        params.tags = "erotic,hentai,adult,nudity";
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
      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) throw new Error(`RAWG browse ${res.status}`);
      const data = await res.json();

      let items: GameItem[] = (data.results || []).map(formatRawgGame);

      // Post-filter for adult content if not included
      if (!options.includeAdult) {
        items = items.filter((item) => !item.isAdult);
      }

      // Post-filter by minimum rating
      if (options.rating !== undefined && options.rating !== null && options.rating > 0) {
        items = items.filter((item) => (item.rating || 0) >= options.rating!);
      }

      // Post-filter game_modes (not supported in RAWG API query params)
      if (options.gameModes && options.gameModes.length > 0) {
        // RAWG doesn't expose modes — skip filter, include all
      }

      return { items, total: data.count || items.length };
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
  }

  // Filter by minimum rating
  if (options.rating !== undefined && options.rating !== null && options.rating > 0) {
    filtered = filtered.filter((g) => (g.rating || 0) >= options.rating!);
  }

  const offset = (page - 1) * limit;
  const paged = filtered.slice(offset, offset + limit);
  return { items: paged, total: filtered.length };
}

