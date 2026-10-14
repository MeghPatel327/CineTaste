import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getUserMovies, type MovieRow } from "@/features/movies/movieRepository";
import {
  getRecommendations,
  expandRecommendationsForFilter,
} from "@/features/recommendations/recommendationService";
import type { RecommendationItem } from "@/features/recommendations/recommendationSetRepository";
import { isAnime } from "@/features/movies/animeClassifier";

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

export interface BrowseCatalogueOptions {
  page?: number;
  limit?: number;
  genres?: string[];
  era?: string;
  subType?: string; // For anime: "all" | "movie" | "tv"
  sort?: "recommended" | "rating" | "year" | "title";
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
const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

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
    genres: r.genres,
    overview: r.overview || "",
    reasons: r.reasons,
    is_anime: r.is_anime,
  };
}

/**
 * Filter an item by decade era
 */
function matchesEra(year: number | undefined, era: string): boolean {
  if (!era || era === "All") return true;
  if (!year) return false;
  if (era === "2020s") return year >= 2020 && year < 2030;
  if (era === "2010s") return year >= 2010 && year < 2020;
  if (era === "2000s") return year >= 2000 && year < 2010;
  if (era === "1990s") return year >= 1990 && year < 2000;
  if (era === "Classic") return year < 1990;
  return true;
}

/**
 * Primary Unified Catalogue Service:
 * Handles Movies, Series, and Anime as mutually exclusive primary browsing destinations,
 * with multi-select filtering, automatic low-result discovery expansion, and paginated infinite-scroll.
 */
export async function getBrowseCatalogueService(
  username: string,
  category: BrowseCategory,
  options: BrowseCatalogueOptions = {},
): Promise<BrowseCatalogueResult> {
  const start = Date.now();
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(60, options.limit || 24));
  const sort = options.sort || "recommended";
  const selectedGenres = (options.genres || []).filter(Boolean);
  const selectedEra = options.era || "";
  const subType = options.subType || "all";
  const query = (options.query || "").toLowerCase().trim();
  const autoExpand = options.autoExpand !== false;

  // 1. Fetch user's personalized 300+ recommendation set
  let rawRecs = await getRecommendations(username);

  // 2. Strict mutual exclusivity partitioning
  const filterForCategory = (items: RecommendationItem[]) => {
    return items.filter((r) => {
      const isAnimeTitle = Boolean(r.is_anime ?? isAnime({
        title: r.title,
        genres: r.genres,
        media_type: r.media_type,
      }));

      if (category === "movies") {
        return !isAnimeTitle && (r.media_type === "movie" || !r.media_type);
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

  let categoryRecs = filterForCategory(rawRecs);

  // Extract all available genres and eras for this category
  const genreSet = new Set<string>();
  categoryRecs.forEach((r) => r.genres.forEach((g) => { if (g) genreSet.add(g); }));
  const availableGenres = Array.from(genreSet).sort();
  const availableEras = ["2020s", "2010s", "2000s", "1990s", "Classic"];

  // 3. Helper to apply active multi-filters
  const applyUserFilters = (items: RecommendationItem[]) => {
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

      // Multi-select genre filter
      if (selectedGenres.length > 0) {
        const hasGenreMatch = selectedGenres.some((sg) =>
          r.genres.some((rg) => rg.toLowerCase() === sg.toLowerCase()),
        );
        if (!hasGenreMatch) return false;
      }

      // Era filter
      if (selectedEra && !matchesEra(r.release_year, selectedEra)) {
        return false;
      }

      return true;
    });
  };

  let filtered = applyUserFilters(categoryRecs);
  let wasExpanded = false;

  // 4. Low-Result Filter Expansion:
  // If a selected filter combination contains fewer than 10 suitable titles,
  // trigger prompt-adjusted Gemini discovery + TMDB verification to discover more.
  const hasActiveNarrowFilter = selectedGenres.length > 0 || (selectedEra && selectedEra !== "All");
  if (autoExpand && hasActiveNarrowFilter && filtered.length < 10) {
    try {
      rawRecs = await expandRecommendationsForFilter(
        username,
        category,
        {
          genres: selectedGenres,
          era: selectedEra,
        },
        rawRecs,
      );

      categoryRecs = filterForCategory(rawRecs);
      filtered = applyUserFilters(categoryRecs);
      wasExpanded = true;
    } catch (err) {
      logger.warn({
        module: "browseService",
        action: "EXPANSION_FAILED",
        category,
        error: err,
      });
    }
  }

  // 5. Convert to standardized BrowseItems
  const browseItems = filtered.map(formatRecToBrowse);

  // 6. Sort
  browseItems.sort((a, b) => {
    if (sort === "rating") {
      return (b.vote_average || 0) - (a.vote_average || 0);
    }
    if (sort === "year") {
      return (b.release_year || 0) - (a.release_year || 0);
    }
    if (sort === "title") {
      return a.title.localeCompare(b.title);
    }
    // Default: recommended match score
    return (b.score || 0) - (a.score || 0);
  });

  // Spotlight banner candidate (highest match item in category)
  const allCategoryBrowse = categoryRecs.map(formatRecToBrowse);
  allCategoryBrowse.sort((a, b) => (b.score || 0) - (a.score || 0));
  const featuredSpotlight = allCategoryBrowse[0] || null;

  // 7. Paginate (YouTube-like infinite scroll batch)
  const total = browseItems.length;
  const startIndex = (page - 1) * limit;
  const pagedItems = browseItems.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < total;

  logger.info({
    module: "browseService",
    action: "GET_CATALOGUE",
    category,
    page,
    limit,
    returned: pagedItems.length,
    total,
    expanded: wasExpanded,
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
