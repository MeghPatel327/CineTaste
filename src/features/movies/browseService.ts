import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getUserMovies } from "@/features/movies/movieRepository";
import {
  getRecommendations,
  expandRecommendationsForFilter,
} from "@/features/recommendations/recommendationService";
import type { RecommendationItem } from "@/features/recommendations/recommendationSetRepository";
import { isAnime } from "@/features/movies/animeClassifier";
import { getCuratedFallbackTitles } from "./curatedCatalogue";
import { matchesEra, itemHasGenre, itemMatchesAllGenres, getTmdbGenreIds, TMDB_GENRES } from "./browseFiltering";

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
  popularity?: number;
  genres: string[];
  overview?: string;
  reasons?: string[];
  is_anime?: boolean;
}

export interface BrowseCatalogueOptions {
  page?: number;
  limit?: number;
  genres?: string[];
  era?: string;
  subType?: string; // For anime: "all" | "movie" | "tv"
  sort?: "recommended" | "popularity" | "rating" | "year" | "year-asc" | "title" | "title-desc";
  query?: string;
  autoExpand?: boolean;
}

export interface BrowseCatalogueResult {
  category: BrowseCategory;
  items: BrowseItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  availableGenres: string[];
  availableEras: string[];
  expanded: boolean;
  featuredSpotlight: BrowseItem | null;
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export const MOVIE_GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "History",
  "Horror", "Music", "Mystery", "Romance", "Science Fiction",
  "Thriller", "TV Movie", "War", "Western",
];

export const SERIES_GENRES = [
  "Action & Adventure", "Animation", "Comedy", "Crime", "Documentary",
  "Drama", "Family", "Kids", "Mystery", "News", "Reality",
  "Sci-Fi & Fantasy", "Soap", "Talk", "War & Politics", "Western",
];

export const ANIME_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Mecha", "Mystery", "Psychological", "Romance",
  "Sci-Fi", "Slice of Life", "Supernatural", "Thriller",
];

export const AVAILABLE_ERAS = [
  "2020s", "2010s", "2000s", "1990s", "1980s", "Classic",
];


const GENRE_NAME_TO_TMDB_ID: Record<string, number> = {
  "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35, "Crime": 80,
  "Documentary": 99, "Drama": 18, "Family": 10751, "Fantasy": 14, "History": 36,
  "Horror": 27, "Music": 10402, "Mystery": 9648, "Romance": 10749, "Science Fiction": 878,
  "Sci-Fi": 878, "Thriller": 53, "War": 10752, "Western": 37,
  "Action & Adventure": 10759, "Kids": 10762, "News": 10763, "Reality": 10764,
  "Sci-Fi & Fantasy": 10765, "Soap": 10766, "Talk": 10767, "War & Politics": 10768,
};

async function tmdbFetch(path: string): Promise<any> {
  if (!env.TMDB_API_KEY) return null;
  const sep = path.includes("?") ? "&" : "?";
  try {
    const res = await fetch(`${TMDB_BASE_URL}${path}${sep}api_key=${env.TMDB_API_KEY}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatRecToBrowse(r: RecommendationItem): BrowseItem {
  return {
    id: r.tmdb_id,
    title: r.title,
    poster_url: r.poster_url,
    backdrop_url: r.backdrop_url || r.poster_url,
    media_type: r.media_type === "tv" ? "tv" : "movie",
    release_year: r.release_year > 0 ? r.release_year : undefined,
    vote_average: r.vote_average > 0 ? r.vote_average : undefined,
    score: r.score,
    popularity: (r as any).popularity || (r.vote_average ? r.vote_average * 10 : r.score || 50),
    genres: r.genres,
    overview: r.overview || "",
    reasons: r.reasons,
    is_anime: r.is_anime,
  };
}



// In-memory extended pool cache to keep track of discovered items per user session
const sessionCataloguePool = new Map<string, { items: BrowseItem[]; fetchedTmdbPages: number; exhausted: boolean }>();

function buildPoolKey(username: string, category: BrowseCategory, options: BrowseCatalogueOptions): string {
  const gKey = (options.genres || []).slice().sort().join(",");
  return `${username}:${category}:${gKey}:${options.era || ""}:${options.subType || "all"}:${options.query || ""}:${options.sort || "recommended"}`;
}

/**
 * Dynamically fetch additional pages from TMDB to keep infinite scroll continuous
 */
async function discoverAdditionalTitles(
  category: BrowseCategory,
  options: BrowseCatalogueOptions,
  neededCount: number,
  existingIds: Set<number>,
  startTmdbPage: number,
): Promise<{ newItems: BrowseItem[]; lastTmdbPage: number; exhausted: boolean }> {
  const selectedGenres = (options.genres || []).filter(Boolean);
  const selectedEra = options.era || "";
  const subType = options.subType || "all";
  const query = (options.query || "").trim();
  const sort = options.sort || "recommended";

  const results: BrowseItem[] = [];
  let currentTmdbPage = startTmdbPage;
  let exhausted = false;
  const MAX_TMDB_PAGES_TO_SCAN = 12; // Sufficient scan depth to satisfy batch size

  const movieGenreIds = getTmdbGenreIds("movies", selectedGenres);
  const tvGenreIds = getTmdbGenreIds("series", selectedGenres);

  const getEraParam = (era: string, type: "movie" | "tv") => {
    if (!era || era === "All") return "";
    const prefix = type === "movie" ? "primary_release_date" : "first_air_date";
    if (era === "2020s") return `&${prefix}.gte=2020-01-01`;
    if (era === "2010s") return `&${prefix}.gte=2010-01-01&${prefix}.lte=2019-12-31`;
    if (era === "2000s") return `&${prefix}.gte=2000-01-01&${prefix}.lte=2009-12-31`;
    if (era === "1990s") return `&${prefix}.gte=1990-01-01&${prefix}.lte=1999-12-31`;
    if (era === "1980s") return `&${prefix}.gte=1980-01-01&${prefix}.lte=1989-12-31`;
    if (era === "Classic") return `&${prefix}.lte=1979-12-31`;
    return "";
  };

  const getSortParam = (s: string, type: "movie" | "tv") => {
    if (s === "popularity") {
      return "&sort_by=popularity.desc";
    }
    if (s === "rating") {
      return type === "movie"
        ? "&sort_by=vote_average.desc&vote_count.gte=80"
        : "&sort_by=vote_average.desc&vote_count.gte=40";
    }
    if (s === "year") {
      return type === "movie"
        ? "&sort_by=primary_release_date.desc&vote_count.gte=10"
        : "&sort_by=first_air_date.desc&vote_count.gte=10";
    }
    if (s === "year-asc") {
      return type === "movie"
        ? "&sort_by=primary_release_date.asc&vote_count.gte=10"
        : "&sort_by=first_air_date.asc&vote_count.gte=10";
    }
    if (s === "title") {
      return type === "movie" ? "&sort_by=original_title.asc" : "&sort_by=name.asc";
    }
    if (s === "title-desc") {
      return type === "movie" ? "&sort_by=original_title.desc" : "&sort_by=name.desc";
    }
    return "&sort_by=popularity.desc";
  };

  let pagesScanned = 0;
  let maxTotalPages = 999;

  while (results.length < neededCount && pagesScanned < MAX_TMDB_PAGES_TO_SCAN) {
    pagesScanned++;
    currentTmdbPage++;

    const endpoints: string[] = [];

    if (query) {
      if (category === "movies") {
        endpoints.push(`/search/movie?query=${encodeURIComponent(query)}&page=${currentTmdbPage}`);
      } else if (category === "series") {
        endpoints.push(`/search/tv?query=${encodeURIComponent(query)}&page=${currentTmdbPage}`);
      } else {
        endpoints.push(`/search/multi?query=${encodeURIComponent(query)}&page=${currentTmdbPage}`);
      }
    } else {
      if (category === "movies") {
        const genreQuery = movieGenreIds.length ? `&with_genres=${movieGenreIds.join(",")}` : "";
        endpoints.push(
          `/discover/movie?page=${currentTmdbPage}${genreQuery}${getEraParam(selectedEra, "movie")}${getSortParam(sort, "movie")}`
        );
      } else if (category === "series") {
        const genreQuery = tvGenreIds.length ? `&with_genres=${tvGenreIds.join(",")}` : "";
        endpoints.push(
          `/discover/tv?page=${currentTmdbPage}${genreQuery}${getEraParam(selectedEra, "tv")}${getSortParam(sort, "tv")}`
        );
      } else if (category === "anime") {
        if (subType === "movie") {
          const genreQuery = movieGenreIds.length ? `,${movieGenreIds.join(",")}` : "";
          endpoints.push(
            `/discover/movie?with_genres=16${genreQuery}&with_original_language=ja&page=${currentTmdbPage}${getEraParam(selectedEra, "movie")}${getSortParam(sort, "movie")}`
          );
        } else if (subType === "tv") {
          const genreQuery = tvGenreIds.length ? `,${tvGenreIds.join(",")}` : "";
          endpoints.push(
            `/discover/tv?with_genres=16${genreQuery}&with_original_language=ja&page=${currentTmdbPage}${getEraParam(selectedEra, "tv")}${getSortParam(sort, "tv")}`
          );
        } else {
          // Both TV and movies for anime destination
          const tvGenreQuery = tvGenreIds.length ? `,${tvGenreIds.join(",")}` : "";
          const movieGenreQuery = movieGenreIds.length ? `,${movieGenreIds.join(",")}` : "";
          endpoints.push(
            `/discover/tv?with_genres=16${tvGenreQuery}&with_original_language=ja&page=${currentTmdbPage}${getEraParam(selectedEra, "tv")}${getSortParam(sort, "tv")}`
          );
          endpoints.push(
            `/discover/movie?with_genres=16${movieGenreQuery}&with_original_language=ja&page=${currentTmdbPage}${getEraParam(selectedEra, "movie")}${getSortParam(sort, "movie")}`
          );
        }
      }
    }

    let pageReturnedItems = 0;

    for (const ep of endpoints) {
      const data = await tmdbFetch(ep);
      if (data?.total_pages && data.total_pages < maxTotalPages) {
        maxTotalPages = data.total_pages;
      }
      const rawList = data?.results || [];
      if (rawList.length > 0) pageReturnedItems += rawList.length;

      for (const r of rawList) {
        if (!r?.id || existingIds.has(r.id)) continue;

        const mediaType: "movie" | "tv" =
          r.media_type === "tv" || r.first_air_date ? "tv" : "movie";

        const isAnimeTitle = isAnime({
          id: r.id,
          media_type: mediaType,
          title: r.title || r.name,
          genre_ids: r.genre_ids,
          original_language: r.original_language,
          origin_country: r.origin_country,
          overview: r.overview,
        });

        // Strict mutual exclusivity
        if (category === "movies" && (isAnimeTitle || mediaType !== "movie")) continue;
        if (category === "series" && (isAnimeTitle || mediaType !== "tv")) continue;
        if (category === "anime" && !isAnimeTitle) continue;

        // Subtype format check for anime
        if (category === "anime" && subType !== "all") {
          if (subType === "movie" && mediaType !== "movie") continue;
          if (subType === "tv" && mediaType !== "tv") continue;
        }

        const releaseDate = r.release_date || r.first_air_date || "";
        const releaseYear = parseInt(releaseDate.split("-")[0], 10) || undefined;

        // Era check
        if (selectedEra && !matchesEra(releaseYear, selectedEra)) continue;

        const genres = (r.genre_ids || [])
          .map((id: number) => TMDB_GENRES[id])
          .filter(Boolean);

        // Strict AND multi-genre matching: title must match ALL selected genres
        if (selectedGenres.length > 0) {
          const hasAll = itemMatchesAllGenres(genres, selectedGenres);
          if (!hasAll) continue;
        }

        existingIds.add(r.id);

        const voteAvg = r.vote_average ? parseFloat(Number(r.vote_average).toFixed(1)) : undefined;
        const score = voteAvg ? Math.round(Math.min(96, Math.max(65, voteAvg * 10 + 10))) : 75;

        results.push({
          id: r.id,
          title: r.title || r.name || "Untitled",
          poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
          backdrop_url: r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : null,
          media_type: mediaType,
          release_year: releaseYear,
          vote_average: voteAvg,
          score,
          popularity: r.popularity ? parseFloat(Number(r.popularity).toFixed(1)) : undefined,
          genres,
          overview: r.overview || "",
          reasons: [
            `Acclaimed ${category === "series" ? "television" : category === "anime" ? "anime" : "cinema"} discovery`,
          ],
          is_anime: isAnimeTitle,
        });

        if (results.length >= neededCount) break;
      }

      if (results.length >= neededCount) break;
    }

    if (currentTmdbPage >= maxTotalPages || (pageReturnedItems === 0 && pagesScanned >= 2)) {
      exhausted = true;
      break;
    }
  }

  return { newItems: results, lastTmdbPage: currentTmdbPage, exhausted };
}

/**
 * Primary Unified Catalogue Service:
 * Handles Movies, Series, and Anime as mutually exclusive primary browsing destinations,
 * with batches of 50, true continuous infinite scroll, destination-appropriate filters,
 * strict multi-genre AND matching, and automatic catalogue expansion.
 */
export async function getBrowseCatalogueService(
  username: string,
  category: BrowseCategory,
  options: BrowseCatalogueOptions = {},
): Promise<BrowseCatalogueResult> {
  const start = Date.now();
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 50));
  const sort = options.sort || "recommended";
  const selectedGenres = (options.genres || []).filter(Boolean);
  const selectedEra = options.era || "";
  const subType = options.subType || "all";
  const query = (options.query || "").toLowerCase().trim();
  const autoExpand = options.autoExpand !== false;

  // 1. Fetch user's personalized recommendation set & user library
  const [rawRecs, userLibrary] = await Promise.all([
    getRecommendations(username, { skipGeneration: true }),
    getUserMovies(username),
  ]);

  const libraryIds = new Set(userLibrary.map((m) => m.tmdb_id));
  const libraryNames = new Set(userLibrary.map((m) => m.movie_name.toLowerCase().trim()));
  const libraryNormalized = new Set(
    userLibrary.map((m) => m.movie_name.toLowerCase().replace(/[^a-z0-9]/g, ""))
  );

  const isLibraryItem = (id: number, title: string) => {
    if (libraryIds.has(id)) return true;
    const lower = title.toLowerCase().trim();
    if (libraryNames.has(lower)) return true;
    const norm = lower.replace(/[^a-z0-9]/g, "");
    if (norm && libraryNormalized.has(norm)) return true;
    return false;
  };

  // 2. Strict mutual exclusivity partitioning
  const filterForCategory = (items: RecommendationItem[]) => {
    return items.filter((r) => {
      const isAnimeTitle = Boolean(
        r.is_anime ??
          isAnime({
            title: r.title,
            genres: r.genres,
            media_type: r.media_type,
          })
      );

      if (category === "movies") {
        // Only explicit movies; unknown media_type is NOT assumed to be a movie
        return !isAnimeTitle && r.media_type === "movie";
      }
      if (category === "series") {
        return !isAnimeTitle && r.media_type === "tv";
      }
      if (category === "anime") {
        return isAnimeTitle;
      }
      return false;
    });
  };

  const categoryRecs = filterForCategory(rawRecs);

  // 3. Destination-specific relevant genres
  let availableGenres: string[];
  if (category === "movies") availableGenres = MOVIE_GENRES;
  else if (category === "series") availableGenres = SERIES_GENRES;
  else availableGenres = ANIME_GENRES;

  const availableEras = AVAILABLE_ERAS;

  // 4. Helper to apply active multi-filters with STRICT AND multi-genre matching
  const applyUserFilters = (items: BrowseItem[]) => {
    return items.filter((r) => {
      // Search query filter
      if (query) {
        const titleMatch = r.title.toLowerCase().includes(query);
        const overviewMatch = (r.overview || "").toLowerCase().includes(query);
        if (!titleMatch && !overviewMatch) return false;
      }

      // Anime sub-type filter (all, movie, tv)
      if (category === "anime" && subType !== "all") {
        if (subType === "movie" && r.media_type !== "movie") return false;
        if (subType === "tv" && r.media_type !== "tv") return false;
      }

      // STRICT MULTI-GENRE AND MATCHING: All selected genres must be present!
      if (selectedGenres.length > 0) {
        const hasAllGenres = itemMatchesAllGenres(r.genres, selectedGenres);
        if (!hasAllGenres) return false;
      }

      // Era filter
      if (selectedEra && !matchesEra(r.release_year, selectedEra)) {
        return false;
      }

      return true;
    });
  };

  // Convert initial category recs to BrowseItem format, or use curated fallback if empty
  const rawFormatted = categoryRecs.map(formatRecToBrowse).filter((i) => !isLibraryItem(i.id, i.title));
  const curatedFallback = getCuratedFallbackTitles(category).filter((i) => !isLibraryItem(i.id, i.title));
  const initialCategoryBrowse = rawFormatted.length > 0 ? rawFormatted : curatedFallback;

  // 5. Check or initialize session pool for this query/filter combination
  const poolKey = buildPoolKey(username, category, options);
  let poolEntry = sessionCataloguePool.get(poolKey);

  const filteredInitial = applyUserFilters(initialCategoryBrowse);

  if (!poolEntry || page === 1) {
    poolEntry = {
      items: [...filteredInitial],
      fetchedTmdbPages: 0,
      exhausted: false,
    };
    sessionCataloguePool.set(poolKey, poolEntry);

    // If initial pool has fewer than batch size, fetch an initial batch directly from TMDB
    if (poolEntry.items.length < limit) {
      const existingIds = new Set<number>([
        ...Array.from(libraryIds),
        ...poolEntry.items.map((i) => i.id),
      ]);
      const neededOnInitial = Math.max(limit, 50 - poolEntry.items.length);
      const discovery = await discoverAdditionalTitles(
        category,
        options,
        neededOnInitial,
        existingIds,
        poolEntry.fetchedTmdbPages,
      );
      poolEntry.fetchedTmdbPages = discovery.lastTmdbPage;
      poolEntry.exhausted = discovery.exhausted;

      for (const item of discovery.newItems) {
        if (!existingIds.has(item.id) && !isLibraryItem(item.id, item.title)) {
          poolEntry.items.push(item);
          existingIds.add(item.id);
        }
      }

      // If pool is still empty (e.g. offline / unconfigured TMDB), ensure curated fallback matches are included
      if (poolEntry.items.length === 0) {
        const fallbackMatches = applyUserFilters(getCuratedFallbackTitles(category)).filter((i) => !isLibraryItem(i.id, i.title));
        for (const item of fallbackMatches) {
          if (!existingIds.has(item.id) && !isLibraryItem(item.id, item.title)) {
            poolEntry.items.push(item);
            existingIds.add(item.id);
          }
        }
        poolEntry.exhausted = true;
      }
    }
  }

  // 6. True Infinite Scroll & Auto-Discovery:
  // If pool has fewer items than needed for the requested page (page * limit),
  // dynamically discover more matching titles until satisfied or catalogue truly exhausted!
  const targetNeededCount = page * limit;
  let wasExpanded = false;

  if (poolEntry.items.length < targetNeededCount && !poolEntry.exhausted) {
    const existingIds = new Set<number>([
      ...Array.from(libraryIds),
      ...poolEntry.items.map((i) => i.id),
      ...initialCategoryBrowse.map((i) => i.id),
    ]);

    // If active strict narrow filter has very few items on page 1, optionally trigger Gemini expansion first
    if (autoExpand && poolEntry.items.length < 15 && (selectedGenres.length > 0 || selectedEra)) {
      try {
        const expandedRecs = await expandRecommendationsForFilter(
          username,
          category,
          { genres: selectedGenres, era: selectedEra },
          rawRecs,
        );
        const freshCategoryRecs = filterForCategory(expandedRecs).map(formatRecToBrowse);
        const freshFiltered = applyUserFilters(freshCategoryRecs);

        const currentIds = new Set(poolEntry.items.map((i) => i.id));
        for (const item of freshFiltered) {
          if (!currentIds.has(item.id) && !isLibraryItem(item.id, item.title)) {
            poolEntry.items.push(item);
            currentIds.add(item.id);
            existingIds.add(item.id);
          }
        }
        wasExpanded = true;
      } catch {
        /* proceed to TMDB */
      }
    }

    // Still need more to satisfy continuous infinite scroll? Query TMDB discover!
    if (poolEntry.items.length < targetNeededCount && !poolEntry.exhausted) {
      const neededFromTmdb = Math.max(limit, targetNeededCount - poolEntry.items.length);
      const discovery = await discoverAdditionalTitles(
        category,
        options,
        neededFromTmdb,
        existingIds,
        poolEntry.fetchedTmdbPages,
      );

      poolEntry.fetchedTmdbPages = discovery.lastTmdbPage;
      poolEntry.exhausted = discovery.exhausted && discovery.newItems.length === 0;

      const currentIds = new Set(poolEntry.items.map((i) => i.id));
      for (const item of discovery.newItems) {
        if (!currentIds.has(item.id) && !isLibraryItem(item.id, item.title)) {
          poolEntry.items.push(item);
          currentIds.add(item.id);
        }
      }
    }
  }

  // 7. Sort pool items (excluding any library items)
  const sortedItems = poolEntry.items.filter((item) => !isLibraryItem(item.id, item.title));
  sortedItems.sort((a, b) => {
    if (sort === "popularity") {
      return (b.popularity || b.score || 0) - (a.popularity || a.score || 0);
    }
    if (sort === "rating") {
      return (b.vote_average || 0) - (a.vote_average || 0);
    }
    if (sort === "year") {
      return (b.release_year || 0) - (a.release_year || 0);
    }
    if (sort === "year-asc") {
      return (a.release_year || 0) - (b.release_year || 0);
    }
    if (sort === "title") {
      return a.title.localeCompare(b.title);
    }
    if (sort === "title-desc") {
      return b.title.localeCompare(a.title);
    }
    // Default: recommended match score
    return (b.score || 0) - (a.score || 0);
  });

  // Spotlight banner candidate (highest match item in category)
  const allCategoryBrowse = initialCategoryBrowse.filter((i) => !isLibraryItem(i.id, i.title));
  allCategoryBrowse.sort((a, b) => (b.score || 0) - (a.score || 0));
  const featuredSpotlight = allCategoryBrowse[0] || sortedItems[0] || null;

  // 8. Paginate (50 titles per batch)
  const total = sortedItems.length;
  const startIndex = (page - 1) * limit;
  const pagedItems = sortedItems.slice(startIndex, startIndex + limit);

  // True continuous scroll: hasMore is true as long as there are more items in pool OR TMDB can yield more
  const hasMore = !poolEntry.exhausted || startIndex + limit < total;

  logger.info({
    module: "browseService",
    action: "GET_CATALOGUE",
    category,
    page,
    limit,
    returned: pagedItems.length,
    poolSize: total,
    hasMore,
    durationMs: Date.now() - start,
  });

  return {
    category,
    items: pagedItems,
    total,
    page,
    pageSize: limit,
    hasMore,
    availableGenres,
    availableEras,
    expanded: wasExpanded,
    featuredSpotlight,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Backward Compatibility for live search if needed
// ─────────────────────────────────────────────────────────────────────────────
export async function searchBrowseService(
  category: BrowseCategory,
  query: string,
  genre?: string,
): Promise<BrowseItem[]> {
  const q = query.trim();
  const searchUrl =
    category === "movies"
      ? `${TMDB_BASE_URL}/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(q)}`
      : category === "series"
      ? `${TMDB_BASE_URL}/search/tv?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(q)}`
      : `${TMDB_BASE_URL}/search/multi?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(searchUrl);
    if (!res.ok) return [];
    const data = await res.json();
    const results: BrowseItem[] = [];

    for (const r of data.results || []) {
      const mediaType = r.media_type === "tv" || r.first_air_date ? "tv" : "movie";
      const isAnimeTitle = isAnime({
        id: r.id,
        media_type: mediaType,
        title: r.title || r.name,
        genre_ids: r.genre_ids,
        original_language: r.original_language,
        origin_country: r.origin_country,
      });

      if (category === "movies" && (isAnimeTitle || mediaType !== "movie")) continue;
      if (category === "series" && (isAnimeTitle || mediaType !== "tv")) continue;
      if (category === "anime" && !isAnimeTitle) continue;

      const releaseDate = r.release_date || r.first_air_date || "";
      const releaseYear = parseInt(releaseDate.split("-")[0], 10) || undefined;
      const genres = (r.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean);

      if (genre && genre !== "All" && !genres.includes(genre)) continue;

      results.push({
        id: r.id,
        title: r.title || r.name || "Untitled",
        poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        backdrop_url: r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : null,
        media_type: mediaType,
        release_year: releaseYear,
        vote_average: r.vote_average ? parseFloat(Number(r.vote_average).toFixed(1)) : undefined,
        genres,
        overview: r.overview || "",
        is_anime: isAnimeTitle,
      });
    }

    return results;
  } catch {
    return [];
  }
}
