import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getUserMovies, type MovieRow } from "@/features/movies/movieRepository";
import {
  getRecommendations,
} from "@/features/recommendations/recommendationService";
import type { RecommendationItem } from "@/features/recommendations/recommendationSetRepository";
import { isAnime, getCanonicalMediaType } from "@/features/movies/animeClassifier";

export type BrowseCategory = "movies" | "series" | "anime";

export interface BrowseItem {
  id: number;
  title: string;
  poster_url: string | null;
  backdrop_url: string | null;
  media_type: "movie" | "tv";
  release_year?: number;
  vote_average?: number;
  score?: number;
  genres: string[];
  overview?: string;
  reasons?: string[];
  is_anime?: boolean;
}

export interface BrowseRail {
  id: string;
  title: string;
  subtitle?: string;
  items: BrowseItem[];
  showScore?: boolean;
  accentBorder?: boolean;
}

export interface BrowseData {
  category: BrowseCategory;
  featured: BrowseItem | null;
  featuredList: BrowseItem[];
  rails: BrowseRail[];
  genres: string[];
  userLibraryIds: number[];
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

// ── In-memory cache for TMDB catalog requests (10 min TTL) ─────────────────────
const tmdbCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function tmdbFetch(path: string): Promise<any> {
  if (!env.TMDB_API_KEY) return null;

  const cacheKey = path;
  const cached = tmdbCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const sep = path.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE_URL}${path}${sep}api_key=${env.TMDB_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    tmdbCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } catch (err) {
    logger.warn({
      module: "browseService",
      action: "TMDB_FETCH",
      status: "FAILED",
      path,
      error: err,
    });
    return null;
  }
}

/**
 * Convert a raw TMDB result into a standardized BrowseItem
 */
function formatTmdbItem(
  raw: any,
  defaultMediaType: "movie" | "tv"
): BrowseItem {
  const mediaType =
    raw.media_type === "tv" || raw.first_air_date ? "tv" : defaultMediaType;
  const title = raw.title || raw.name || "Untitled";
  const releaseDate = raw.release_date || raw.first_air_date || "";
  const releaseYear = releaseDate ? parseInt(releaseDate.split("-")[0], 10) : undefined;

  const genres: string[] = [];
  if (Array.isArray(raw.genre_ids)) {
    for (const gid of raw.genre_ids) {
      if (TMDB_GENRES[gid]) genres.push(TMDB_GENRES[gid]);
    }
  } else if (Array.isArray(raw.genres)) {
    for (const g of raw.genres) {
      if (typeof g === "string") genres.push(g);
      else if (g?.name) genres.push(g.name);
    }
  }

  const poster_url = raw.poster_path
    ? `https://image.tmdb.org/t/p/w500${raw.poster_path}`
    : null;
  const backdrop_url = raw.backdrop_path
    ? `https://image.tmdb.org/t/p/original${raw.backdrop_path}`
    : poster_url;

  return {
    id: raw.id,
    title,
    poster_url,
    backdrop_url,
    media_type: mediaType,
    release_year: releaseYear && !isNaN(releaseYear) ? releaseYear : undefined,
    vote_average: raw.vote_average ? parseFloat(Number(raw.vote_average).toFixed(1)) : undefined,
    genres: genres.slice(0, 3),
    overview: raw.overview || "",
    is_anime: isAnime(raw),
  };
}

/**
 * Format a recommendation item into a BrowseItem
 */
function formatRecItem(r: RecommendationItem): BrowseItem {
  return {
    id: r.tmdb_id,
    title: r.title,
    poster_url: r.poster_url,
    backdrop_url: r.backdrop_url || r.poster_url,
    media_type: r.media_type === "tv" ? "tv" : "movie",
    release_year: r.release_year > 0 ? r.release_year : undefined,
    vote_average: r.vote_average > 0 ? r.vote_average : undefined,
    score: r.score,
    genres: r.genres.slice(0, 3),
    overview: r.overview || "",
    reasons: r.reasons,
    is_anime: isAnime({
      genres: r.genres,
      title: r.title,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Browse Feed
// ─────────────────────────────────────────────────────────────────────────────
export async function getBrowseFeedService(
  username: string,
  category: BrowseCategory
): Promise<BrowseData> {
  const start = Date.now();
  logger.info({
    module: "browseService",
    action: "GET_BROWSE_FEED",
    category,
    username,
    status: "STARTED",
  });

  // 1. Fetch user library and hybrid recommendations concurrently
  const [userMovies, rawRecs] = await Promise.all([
    getUserMovies(username).catch(() => [] as MovieRow[]),
    getRecommendations(username).catch(() => [] as RecommendationItem[]),
  ]);

  const libraryIds = new Set(userMovies.map((m) => m.tmdb_id));
  const libraryTitles = new Set(
    userMovies.map((m) => m.movie_name.toLowerCase().trim())
  );

  const isInLibrary = (item: { id?: number; title?: string }) => {
    if (item.id && libraryIds.has(item.id)) return true;
    if (item.title && libraryTitles.has(item.title.toLowerCase().trim())) return true;
    return false;
  };

  // 2. Filter personalized recommendations for this category
  let personalizedItems: BrowseItem[] = [];

  if (category === "movies") {
    personalizedItems = rawRecs
      .filter((r) => (r.media_type === "movie" || !r.media_type) && !isInLibrary({ id: r.tmdb_id, title: r.title }))
      .map(formatRecItem);
  } else if (category === "series") {
    personalizedItems = rawRecs
      .filter((r) => r.media_type === "tv" && !isInLibrary({ id: r.tmdb_id, title: r.title }))
      .map(formatRecItem);
  } else if (category === "anime") {
    personalizedItems = rawRecs
      .filter((r) => isAnime(r) && !isInLibrary({ id: r.tmdb_id, title: r.title }))
      .map(formatRecItem);
  }

  // 3. Fallback supplement if recommendations pool is small for this category
  if (personalizedItems.length < 6) {
    let fallbackPath = "";
    if (category === "movies") {
      fallbackPath = "/movie/top_rated?page=1";
    } else if (category === "series") {
      fallbackPath = "/tv/top_rated?page=1";
    } else {
      fallbackPath =
        "/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=100&page=1";
    }

    const fallbackData = await tmdbFetch(fallbackPath);
    if (fallbackData?.results) {
      const existingIds = new Set(personalizedItems.map((p) => p.id));
      const needed = 12 - personalizedItems.length;

      for (const item of fallbackData.results) {
        if (!item.id || existingIds.has(item.id) || isInLibrary(item)) continue;
        if (category === "anime" && !isAnime(item)) continue;

        const formatted = formatTmdbItem(
          item,
          category === "series" ? "tv" : "movie"
        );
        formatted.score = Math.min(
          95,
          Math.max(82, Math.round((formatted.vote_average || 7.5) * 11))
        );
        formatted.reasons = ["Critically acclaimed title aligned with your profile"];
        personalizedItems.push(formatted);
        existingIds.add(item.id);
        if (personalizedItems.length >= 12) break;
      }
    }
  }

  // 4. Fetch TMDB rails based on category
  const rails: BrowseRail[] = [];
  let featuredList: BrowseItem[] = [];
  const genreFilters: string[] = [];

  if (category === "movies") {
    genreFilters.push(
      "All", "Action", "Adventure", "Comedy", "Crime", "Drama", "Fantasy",
      "Horror", "Mystery", "Romance", "Science Fiction", "Thriller"
    );

    const [
      trendingData,
      popularData,
      topRatedData,
      actionData,
      scifiData,
      dramaData,
      thrillerData,
    ] = await Promise.all([
      tmdbFetch("/trending/movie/week"),
      tmdbFetch("/movie/popular"),
      tmdbFetch("/movie/top_rated"),
      tmdbFetch("/discover/movie?with_genres=28&sort_by=popularity.desc"),
      tmdbFetch("/discover/movie?with_genres=878&sort_by=popularity.desc"),
      tmdbFetch("/discover/movie?with_genres=18&sort_by=popularity.desc"),
      tmdbFetch("/discover/movie?with_genres=53&sort_by=popularity.desc"),
    ]);

    const formatList = (results: any[]) =>
      (results || [])
        .filter((r: any) => r && !isInLibrary(r))
        .map((r: any) => formatTmdbItem(r, "movie"))
        .slice(0, 16);

    const trending = formatList(trendingData?.results);
    const popular = formatList(popularData?.results);
    const topRated = formatList(topRatedData?.results);
    const action = formatList(actionData?.results);
    const scifi = formatList(scifiData?.results);
    const drama = formatList(dramaData?.results);
    const thriller = formatList(thrillerData?.results);

    featuredList = [...trending.slice(0, 4), ...popular.slice(0, 4)].filter(
      (m, idx, self) => self.findIndex((s) => s.id === m.id) === idx && !!m.backdrop_url
    );

    if (personalizedItems.length > 0) {
      rails.push({
        id: "rec-movies",
        title: "⭐ Recommended Movies For You",
        subtitle: "Tailored to your personal taste profile",
        items: personalizedItems.slice(0, 16),
        showScore: true,
        accentBorder: true,
      });
    }

    if (trending.length > 0) {
      rails.push({
        id: "trending-movies",
        title: "🔥 Trending Movies This Week",
        subtitle: "The most watched films across the globe",
        items: trending,
      });
    }

    if (popular.length > 0) {
      rails.push({
        id: "popular-movies",
        title: "🎬 Popular Movies",
        subtitle: "Blockbusters and crowd favorites",
        items: popular,
      });
    }

    if (topRated.length > 0) {
      rails.push({
        id: "top-rated-movies",
        title: "🏆 All-Time Highest Rated",
        subtitle: "Cinematic milestones and masterpieces",
        items: topRated,
      });
    }

    if (scifi.length > 0) {
      rails.push({
        id: "genre-scifi",
        title: "🚀 Sci-Fi & Future Visions",
        items: scifi,
      });
    }

    if (action.length > 0) {
      rails.push({
        id: "genre-action",
        title: "⚡ High-Octane Action",
        items: action,
      });
    }

    if (thriller.length > 0) {
      rails.push({
        id: "genre-thriller",
        title: "🔍 Mystery & Suspense",
        items: thriller,
      });
    }

    if (drama.length > 0) {
      rails.push({
        id: "genre-drama",
        title: "🎭 Gripping Dramas",
        items: drama,
      });
    }
  } else if (category === "series") {
    genreFilters.push(
      "All", "Action & Adventure", "Comedy", "Crime", "Drama",
      "Mystery", "Sci-Fi & Fantasy", "Animation"
    );

    const [
      trendingData,
      popularData,
      topRatedData,
      scifiFantasyData,
      dramaData,
      crimeData,
      actionAdvData,
    ] = await Promise.all([
      tmdbFetch("/trending/tv/week"),
      tmdbFetch("/tv/popular"),
      tmdbFetch("/tv/top_rated"),
      tmdbFetch("/discover/tv?with_genres=10765&sort_by=popularity.desc"),
      tmdbFetch("/discover/tv?with_genres=18&sort_by=popularity.desc"),
      tmdbFetch("/discover/tv?with_genres=80&sort_by=popularity.desc"),
      tmdbFetch("/discover/tv?with_genres=10759&sort_by=popularity.desc"),
    ]);

    const formatList = (results: any[]) =>
      (results || [])
        .filter((r: any) => r && !isInLibrary(r))
        .map((r: any) => formatTmdbItem(r, "tv"))
        .slice(0, 16);

    const trending = formatList(trendingData?.results);
    const popular = formatList(popularData?.results);
    const topRated = formatList(topRatedData?.results);
    const scifiFantasy = formatList(scifiFantasyData?.results);
    const drama = formatList(dramaData?.results);
    const crime = formatList(crimeData?.results);
    const actionAdv = formatList(actionAdvData?.results);

    featuredList = [...trending.slice(0, 4), ...popular.slice(0, 4)].filter(
      (m, idx, self) => self.findIndex((s) => s.id === m.id) === idx && !!m.backdrop_url
    );

    if (personalizedItems.length > 0) {
      rails.push({
        id: "rec-series",
        title: "⭐ Recommended Series For You",
        subtitle: "Binge-worthy TV shows tailored to your taste",
        items: personalizedItems.slice(0, 16),
        showScore: true,
        accentBorder: true,
      });
    }

    if (trending.length > 0) {
      rails.push({
        id: "trending-series",
        title: "🔥 Trending Series This Week",
        subtitle: "Currently captivating television audiences",
        items: trending,
      });
    }

    if (popular.length > 0) {
      rails.push({
        id: "popular-series",
        title: "📺 Popular TV Shows",
        subtitle: "Most streamed and discussed television series",
        items: popular,
      });
    }

    if (topRated.length > 0) {
      rails.push({
        id: "top-rated-series",
        title: "🏆 Acclaimed Masterpieces",
        subtitle: "The highest rated series of all time",
        items: topRated,
      });
    }

    if (scifiFantasy.length > 0) {
      rails.push({
        id: "genre-scifi-tv",
        title: "🌌 Sci-Fi & Fantasy Epics",
        items: scifiFantasy,
      });
    }

    if (crime.length > 0) {
      rails.push({
        id: "genre-crime-tv",
        title: "🕵️ Crime & Investigation",
        items: crime,
      });
    }

    if (drama.length > 0) {
      rails.push({
        id: "genre-drama-tv",
        title: "🎭 Prestige Drama",
        items: drama,
      });
    }

    if (actionAdv.length > 0) {
      rails.push({
        id: "genre-action-tv",
        title: "💥 Action & Thrills",
        items: actionAdv,
      });
    }
  } else if (category === "anime") {
    genreFilters.push(
      "All", "Action", "Adventure", "Fantasy", "Sci-Fi",
      "Comedy", "Drama", "Romance", "Mystery", "Supernatural"
    );

    // Anime discovery across movies and series
    const [
      animeSeriesPopular,
      animeMoviesPopular,
      animeTopRatedSeries,
      animeTopRatedMovies,
      animeActionSeries,
      animeFantasySeries,
      animeRomanceSeries,
    ] = await Promise.all([
      tmdbFetch("/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc"),
      tmdbFetch("/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc"),
      tmdbFetch("/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=100"),
      tmdbFetch("/discover/movie?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=100"),
      tmdbFetch("/discover/tv?with_genres=16,10759&with_original_language=ja&sort_by=popularity.desc"),
      tmdbFetch("/discover/tv?with_genres=16,10765&with_original_language=ja&sort_by=popularity.desc"),
      tmdbFetch("/discover/tv?with_genres=16,18&with_original_language=ja&sort_by=popularity.desc"),
    ]);

    const formatAnimeList = (results: any[], defType: "movie" | "tv") =>
      (results || [])
        .filter((r: any) => r && isAnime(r) && !isInLibrary(r))
        .map((r: any) => formatTmdbItem(r, defType))
        .slice(0, 16);

    const seriesPopular = formatAnimeList(animeSeriesPopular?.results, "tv");
    const moviesPopular = formatAnimeList(animeMoviesPopular?.results, "movie");
    const topRatedSeries = formatAnimeList(animeTopRatedSeries?.results, "tv");
    const topRatedMovies = formatAnimeList(animeTopRatedMovies?.results, "movie");
    const actionShonen = formatAnimeList(animeActionSeries?.results, "tv");
    const fantasy = formatAnimeList(animeFantasySeries?.results, "tv");
    const romanceDrama = formatAnimeList(animeRomanceSeries?.results, "tv");

    // Interleave series and movies for featured & trending
    const trendingCombined: BrowseItem[] = [];
    const maxLen = Math.max(seriesPopular.length, moviesPopular.length);
    for (let i = 0; i < maxLen; i++) {
      if (seriesPopular[i]) trendingCombined.push(seriesPopular[i]);
      if (moviesPopular[i]) trendingCombined.push(moviesPopular[i]);
    }

    featuredList = trendingCombined
      .filter((m) => !!m.backdrop_url)
      .slice(0, 8);

    if (personalizedItems.length > 0) {
      rails.push({
        id: "rec-anime",
        title: "⭐ Recommended Anime For You",
        subtitle: "Anime tailored to your taste and viewing patterns",
        items: personalizedItems.slice(0, 16),
        showScore: true,
        accentBorder: true,
      });
    }

    if (trendingCombined.length > 0) {
      rails.push({
        id: "trending-anime",
        title: "🔥 Trending Anime Right Now",
        subtitle: "The most popular anime series and theatrical films",
        items: trendingCombined.slice(0, 16),
      });
    }

    if (seriesPopular.length > 0) {
      rails.push({
        id: "popular-anime-series",
        title: "📺 Top Anime Series",
        subtitle: "Ongoing and completed episodic anime",
        items: seriesPopular,
      });
    }

    if (moviesPopular.length > 0) {
      rails.push({
        id: "popular-anime-movies",
        title: "🎬 Iconic Anime Movies",
        subtitle: "Theatrical features and animated cinema",
        items: moviesPopular,
      });
    }

    if (topRatedSeries.length > 0 || topRatedMovies.length > 0) {
      const topRatedCombined = [...topRatedSeries.slice(0, 8), ...topRatedMovies.slice(0, 8)];
      rails.push({
        id: "top-rated-anime",
        title: "🏆 Hall of Fame Anime",
        subtitle: "The highest rated anime productions of all time",
        items: topRatedCombined,
      });
    }

    if (actionShonen.length > 0) {
      rails.push({
        id: "genre-action-anime",
        title: "⚔️ Action & Shonen",
        items: actionShonen,
      });
    }

    if (fantasy.length > 0) {
      rails.push({
        id: "genre-fantasy-anime",
        title: "✨ Fantasy, Isekai & Supernatural",
        items: fantasy,
      });
    }

    if (romanceDrama.length > 0) {
      rails.push({
        id: "genre-romance-anime",
        title: "🌸 Romance & Slice of Life",
        items: romanceDrama,
      });
    }
  }

  const featured = featuredList[0] || personalizedItems[0] || null;

  logger.info({
    module: "browseService",
    action: "GET_BROWSE_FEED",
    category,
    status: "SUCCESS",
    durationMs: Date.now() - start,
    railsCount: rails.length,
    featured: featured?.title,
  });

  return {
    category,
    featured,
    featuredList,
    rails,
    genres: genreFilters,
    userLibraryIds: Array.from(libraryIds),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Search & Filter within a Category
// ─────────────────────────────────────────────────────────────────────────────
export async function searchBrowseService(
  category: BrowseCategory,
  query: string,
  genre?: string
): Promise<BrowseItem[]> {
  const cleanQuery = query?.trim() || "";
  const cleanGenre = genre?.trim() || "";

  if (!cleanQuery && (!cleanGenre || cleanGenre === "All")) {
    return [];
  }

  let endpoint = "";

  if (cleanQuery) {
    if (category === "movies") {
      endpoint = `/search/movie?query=${encodeURIComponent(cleanQuery)}&include_adult=false`;
    } else if (category === "series") {
      endpoint = `/search/tv?query=${encodeURIComponent(cleanQuery)}&include_adult=false`;
    } else {
      // Anime: multi search then filter with isAnime
      endpoint = `/search/multi?query=${encodeURIComponent(cleanQuery)}&include_adult=false`;
    }
  } else if (cleanGenre && cleanGenre !== "All") {
    // Genre discovery without text query
    const genreEntries = Object.entries(TMDB_GENRES);
    const matched = genreEntries.find(([, name]) =>
      name.toLowerCase() === cleanGenre.toLowerCase()
    );
    const genreId = matched ? matched[0] : "";

    if (category === "movies") {
      endpoint = `/discover/movie?with_genres=${genreId}&sort_by=popularity.desc`;
    } else if (category === "series") {
      endpoint = `/discover/tv?with_genres=${genreId}&sort_by=popularity.desc`;
    } else {
      endpoint = `/discover/tv?with_genres=16${genreId ? `,${genreId}` : ""}&with_original_language=ja&sort_by=popularity.desc`;
    }
  }

  if (!endpoint) return [];

  const data = await tmdbFetch(endpoint);
  if (!data?.results) return [];

  const defaultType: "movie" | "tv" = category === "series" ? "tv" : "movie";

  const results: BrowseItem[] = [];

  for (const raw of data.results) {
    if (!raw.id) continue;

    // Strict category filtering
    if (category === "movies") {
      if (raw.media_type === "tv" || (raw.first_air_date && !raw.release_date)) continue;
    } else if (category === "series") {
      if (raw.media_type === "movie" || (raw.release_date && !raw.first_air_date)) continue;
    } else if (category === "anime") {
      if (!isAnime(raw)) continue;
    }

    results.push(formatTmdbItem(raw, defaultType));
  }

  return results.slice(0, 30);
}
