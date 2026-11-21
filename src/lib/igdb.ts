import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { GameItem, GameDetails, GameFilterOptions } from "@/features/games/gameTypes";
import { CURATED_GAMES } from "@/features/games/curatedGames";

interface TwitchTokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TwitchTokenCache | null = null;
let tokenRequestPromise: Promise<string | null> | null = null;

// IGDB Rate Limiter: max 4 requests per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 260; // ~3.8 req/s to stay safely below 4 req/s limit

async function throttleIgdbRequest(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    const delay = MIN_REQUEST_INTERVAL_MS - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
}

/**
 * Normalizes IGDB image URL to high-resolution HTTPS
 */
export function normalizeIgdbImageUrl(
  url: string | null | undefined,
  size: "cover_big" | "1080p" | "720p" | "screenshot_big" = "cover_big"
): string | null {
  if (!url) return null;
  let normalized = url.trim();
  if (normalized.startsWith("//")) {
    normalized = `https:${normalized}`;
  } else if (!normalized.startsWith("http")) {
    normalized = `https://${normalized}`;
  }
  // Replace thumbnail with high-res token
  return normalized.replace(/t_[a-z0-9_]+(?=\/)/, `t_${size}`);
}

/**
 * Retrieves Twitch OAuth2 client_credentials token with in-memory caching
 */
export async function getTwitchAccessToken(): Promise<string | null> {
  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) {
    return null;
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  if (tokenRequestPromise) {
    return tokenRequestPromise;
  }

  tokenRequestPromise = (async () => {
    try {
      const params = new URLSearchParams({
        client_id: env.IGDB_CLIENT_ID,
        client_secret: env.IGDB_CLIENT_SECRET,
        grant_type: "client_credentials",
      });

      const res = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.warn({
          module: "igdb",
          action: "TWITCH_AUTH_FAILED",
          status: "FAILED",
          error: `${res.status}: ${errorText}`,
        });
        return null;
      }

      const data = await res.json();
      const expiresInMs = (data.expires_in || 3600) * 1000;
      tokenCache = {
        accessToken: data.access_token,
        expiresAt: Date.now() + expiresInMs,
      };

      return data.access_token;
    } catch (err) {
      logger.error({
        module: "igdb",
        action: "TWITCH_AUTH_ERROR",
        error: err,
      });
      return null;
    } finally {
      tokenRequestPromise = null;
    }
  })();

  return tokenRequestPromise;
}

/**
 * Execute a raw Apicalypse query against IGDB endpoint
 */
export async function queryIgdb(endpoint: string, query: string): Promise<any[] | null> {
  const token = await getTwitchAccessToken();
  if (!token) return null;

  await throttleIgdbRequest();

  try {
    const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": env.IGDB_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body: query,
    });

    if (!res.ok) {
      const err = await res.text();
      logger.warn({
        module: "igdb",
        action: "IGDB_QUERY_FAILED",
        endpoint,
        status: "FAILED",
        error: `${res.status}: ${err}`,
      });
      return null;
    }

    return await res.json();
  } catch (err) {
    logger.error({
      module: "igdb",
      action: "IGDB_QUERY_ERROR",
      endpoint,
      error: err,
    });
    return null;
  }
}

/**
 * Transforms raw IGDB API item into standard GameItem
 */
export function formatRawIgdbGame(raw: any): GameItem {
  const releaseYear = raw.first_release_date
    ? new Date(raw.first_release_date * 1000).getUTCFullYear()
    : undefined;

  const genres: string[] = (raw.genres || []).map((g: any) => g.name).filter(Boolean);
  const platforms: string[] = (raw.platforms || [])
    .map((p: any) => p.name || p.abbreviation)
    .filter(Boolean);
  const gameModes: string[] = (raw.game_modes || []).map((m: any) => m.name).filter(Boolean);
  const themes: string[] = (raw.themes || []).map((t: any) => t.name).filter(Boolean);

  let developer: string | null = null;
  let publisher: string | null = null;

  if (Array.isArray(raw.involved_companies)) {
    const devCompany = raw.involved_companies.find((c: any) => c.developer);
    const pubCompany = raw.involved_companies.find((c: any) => c.publisher);
    if (devCompany?.company?.name) developer = devCompany.company.name;
    if (pubCompany?.company?.name) publisher = pubCompany.company.name;
  }

  const rawRating = raw.total_rating ?? raw.rating;
  const rating10 = rawRating ? parseFloat((rawRating / 10).toFixed(1)) : undefined;
  const matchScore = rating10 ? Math.round(Math.min(98, Math.max(65, rating10 * 10))) : 80;

  const backdrop = raw.artworks?.[0]?.url || raw.screenshots?.[0]?.url;

  return {
    id: raw.id,
    title: raw.name || "Untitled Game",
    cover_url: normalizeIgdbImageUrl(raw.cover?.url, "cover_big"),
    backdrop_url: normalizeIgdbImageUrl(backdrop, "1080p"),
    release_year: releaseYear,
    first_release_date: raw.first_release_date,
    rating: rating10,
    igdb_rating: rawRating ? Math.round(rawRating) : undefined,
    rating_count: raw.total_rating_count || raw.rating_count || 0,
    score: matchScore,
    genres,
    platforms,
    game_modes: gameModes,
    themes,
    developer,
    publisher,
    summary: raw.summary || raw.storyline || "",
    storyline: raw.storyline || "",
  };
}

/**
 * Searches IGDB for games matching query string
 */
export async function searchIgdbGames(query: string, limit = 20): Promise<GameItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apicalypse = `
    search "${trimmed.replace(/"/g, '\\"')}";
    fields name, summary, storyline, cover.url, first_release_date, genres.name, themes.name, game_modes.name, platforms.name, platforms.abbreviation, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, total_rating, total_rating_count, rating, rating_count, screenshots.url, artworks.url;
    limit ${limit};
  `;

  const results = await queryIgdb("games", apicalypse);
  if (results && results.length > 0) {
    return results.map(formatRawIgdbGame);
  }

  // Fallback to local curated games search
  const lower = trimmed.toLowerCase();
  return CURATED_GAMES.filter(
    (g) =>
      g.title.toLowerCase().includes(lower) ||
      g.genres.some((gen) => gen.toLowerCase().includes(lower)) ||
      (g.developer && g.developer.toLowerCase().includes(lower))
  ).slice(0, limit);
}

/**
 * Fetches deep game details by IGDB ID
 */
export async function getIgdbGameDetails(id: number): Promise<GameDetails | null> {
  const apicalypse = `
    fields name, summary, storyline, cover.url, first_release_date, genres.name, themes.name, game_modes.name, platforms.name, platforms.abbreviation, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, total_rating, total_rating_count, rating, rating_count, screenshots.url, artworks.url, similar_games.id, similar_games.name, similar_games.cover.url, similar_games.first_release_date;
    where id = ${id};
    limit 1;
  `;

  const raw = await queryIgdb("games", apicalypse);
  if (raw && raw.length > 0) {
    const item = raw[0];
    const base = formatRawIgdbGame(item);
    const screenshots = (item.screenshots || [])
      .map((s: any) => normalizeIgdbImageUrl(s.url, "1080p"))
      .filter(Boolean) as string[];
    const artworks = (item.artworks || [])
      .map((a: any) => normalizeIgdbImageUrl(a.url, "1080p"))
      .filter(Boolean) as string[];

    const similar_games = (item.similar_games || []).slice(0, 8).map((sg: any) => ({
      id: sg.id,
      title: sg.name,
      cover_url: normalizeIgdbImageUrl(sg.cover?.url, "cover_big"),
      release_year: sg.first_release_date
        ? new Date(sg.first_release_date * 1000).getUTCFullYear()
        : undefined,
    }));

    return {
      ...base,
      screenshots,
      artworks,
      similar_games,
    };
  }

  // Fallback search in curated games
  const found = CURATED_GAMES.find((g) => g.id === id);
  if (found) {
    return {
      ...found,
      screenshots: found.backdrop_url ? [found.backdrop_url] : [],
      artworks: [],
      similar_games: CURATED_GAMES.filter((g) => g.id !== id && g.genres.some((gen) => found.genres.includes(gen)))
        .slice(0, 6)
        .map((sg) => ({
          id: sg.id,
          title: sg.title,
          cover_url: sg.cover_url,
          release_year: sg.release_year,
        })),
    };
  }

  return null;
}

/**
 * Browse games with dynamic filtering and fallback support
 */
export async function browseIgdbGames(options: GameFilterOptions = {}): Promise<{
  items: GameItem[];
  total: number;
}> {
  const limit = options.limit || 50;
  const page = options.page || 1;
  const offset = (page - 1) * limit;

  // Attempt live IGDB query if configured
  if (env.IGDB_CLIENT_ID && env.IGDB_CLIENT_SECRET) {
    const filters: string[] = ["cover != null", "total_rating != null", "total_rating_count > 5"];

    if (options.query) {
      return {
        items: await searchIgdbGames(options.query, limit),
        total: 50,
      };
    }

    if (options.era) {
      if (options.era === "2020s") filters.push("first_release_date >= 1577836800");
      else if (options.era === "2010s")
        filters.push("first_release_date >= 1262304000 & first_release_date <= 1577836799");
      else if (options.era === "2000s")
        filters.push("first_release_date >= 946684800 & first_release_date <= 1262303999");
      else if (options.era === "1990s")
        filters.push("first_release_date >= 631152000 & first_release_date <= 946684799");
      else if (options.era === "Classic") filters.push("first_release_date < 631152000");
    }

    let sortClause = "sort total_rating desc;";
    if (options.sort === "popularity") sortClause = "sort total_rating_count desc;";
    else if (options.sort === "rating") sortClause = "sort total_rating desc;";
    else if (options.sort === "year") sortClause = "sort first_release_date desc;";
    else if (options.sort === "year-asc") sortClause = "sort first_release_date asc;";
    else if (options.sort === "title") sortClause = "sort name asc;";
    else if (options.sort === "title-desc") sortClause = "sort name desc;";

    const apicalypse = `
      fields name, summary, storyline, cover.url, first_release_date, genres.name, themes.name, game_modes.name, platforms.name, platforms.abbreviation, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, total_rating, total_rating_count, rating, rating_count, screenshots.url, artworks.url;
      where ${filters.join(" & ")};
      ${sortClause}
      offset ${offset};
      limit ${limit};
    `;

    const liveData = await queryIgdb("games", apicalypse);
    if (liveData && liveData.length > 0) {
      let formatted = liveData.map(formatRawIgdbGame);

      // In-memory filter on multi-genre / platforms / gameModes if needed
      if (options.genres && options.genres.length > 0) {
        formatted = formatted.filter((item) =>
          options.genres!.every((g) =>
            item.genres.some((ig) => ig.toLowerCase() === g.toLowerCase())
          )
        );
      }
      if (options.platforms && options.platforms.length > 0) {
        formatted = formatted.filter((item) =>
          options.platforms!.some((p) =>
            item.platforms.some((ip) => ip.toLowerCase().includes(p.toLowerCase()))
          )
        );
      }
      if (options.gameModes && options.gameModes.length > 0) {
        formatted = formatted.filter((item) =>
          options.gameModes!.some((m) =>
            item.game_modes.some((im) => im.toLowerCase() === m.toLowerCase())
          )
        );
      }

      return {
        items: formatted,
        total: Math.max(100, formatted.length + offset),
      };
    }
  }

  // Fallback to rich curated games list
  let filtered = [...CURATED_GAMES];

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
    filtered = filtered.filter((g) =>
      options.genres!.every((gen) =>
        g.genres.some((itemGen) => itemGen.toLowerCase() === gen.toLowerCase())
      )
    );
  }

  if (options.platforms && options.platforms.length > 0) {
    filtered = filtered.filter((g) =>
      options.platforms!.some((plat) =>
        g.platforms.some((itemPlat) => itemPlat.toLowerCase().includes(plat.toLowerCase()))
      )
    );
  }

  if (options.gameModes && options.gameModes.length > 0) {
    filtered = filtered.filter((g) =>
      options.gameModes!.some((mode) =>
        g.game_modes.some((itemMode) => itemMode.toLowerCase() === mode.toLowerCase())
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

  // Sort
  filtered.sort((a, b) => {
    if (options.sort === "rating") return (b.rating || 0) - (a.rating || 0);
    if (options.sort === "popularity") return (b.rating_count || 0) - (a.rating_count || 0);
    if (options.sort === "year") return (b.release_year || 0) - (a.release_year || 0);
    if (options.sort === "year-asc") return (a.release_year || 0) - (b.release_year || 0);
    if (options.sort === "title") return a.title.localeCompare(b.title);
    if (options.sort === "title-desc") return b.title.localeCompare(a.title);
    return (b.score || 0) - (a.score || 0);
  });

  const paged = filtered.slice(offset, offset + limit);

  return {
    items: paged,
    total: filtered.length,
  };
}
