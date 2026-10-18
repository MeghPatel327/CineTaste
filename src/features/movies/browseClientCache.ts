"use client";

import type {
  BrowseCategory,
  BrowseItem,
  BrowseCatalogueResult,
} from "./browseService";

export interface CategoryCacheItem {
  items: BrowseItem[];
  total: number;
  page: number;
  hasMore: boolean;
  availableGenres: string[];
  availableEras: string[];
  featuredSpotlight: BrowseItem | null;
  selectedGenres: string[];
  selectedEra: string;
  subType: string;
  sort: string;
  searchQuery: string;
  fetchedAt: number;
}

export const BROWSE_BATCH_SIZE = 50;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes hot cache

// Module-level persistent cache across route changes
const browseCache = new Map<string, CategoryCacheItem>();
const inflightRequests = new Map<string, Promise<BrowseCatalogueResult>>();

export function buildCacheKey(
  category: BrowseCategory,
  params: {
    sort?: string;
    subType?: string;
    genres?: string[];
    era?: string;
    query?: string;
  } = {}
): string {
  const genresKey = (params.genres || []).slice().sort().join(",");
  return `${category}|sort:${params.sort || "recommended"}|sub:${params.subType || "all"}|genres:${genresKey}|era:${params.era || ""}|q:${(params.query || "").trim().toLowerCase()}`;
}

export interface CachedCategoryResponse extends CategoryCacheItem {
  isStale: boolean;
}

export function getCachedCategoryData(
  category: BrowseCategory,
  params?: {
    sort?: string;
    subType?: string;
    genres?: string[];
    era?: string;
    query?: string;
  },
  allowStale = true
): CachedCategoryResponse | null {
  const key = buildCacheKey(category, params);
  const cached = browseCache.get(key);
  if (cached) {
    const isStale = Date.now() - cached.fetchedAt >= CACHE_TTL_MS;
    if (!allowStale && isStale) return null;
    return { ...cached, isStale };
  }
  // Fallback to default category cache if available
  const defaultKey = buildCacheKey(category);
  const defaultCached = browseCache.get(defaultKey);
  if (!params && defaultCached) {
    const isStale = Date.now() - defaultCached.fetchedAt >= CACHE_TTL_MS;
    if (!allowStale && isStale) return null;
    return { ...defaultCached, isStale };
  }
  return null;
}

export function setCachedCategoryData(
  category: BrowseCategory,
  data: CategoryCacheItem,
  params?: {
    sort?: string;
    subType?: string;
    genres?: string[];
    era?: string;
    query?: string;
  }
) {
  const key = buildCacheKey(category, params);
  browseCache.set(key, data);
}

/**
 * Fetch a catalogue page with in-flight deduplication and batch size 50.
 */
export async function fetchCatalogueBatch(
  category: BrowseCategory,
  options: {
    page: number;
    limit?: number;
    sort?: string;
    subType?: string;
    genres?: string[];
    era?: string;
    query?: string;
  }
): Promise<BrowseCatalogueResult> {
  const limit = options.limit || BROWSE_BATCH_SIZE;
  const page = options.page || 1;
  const sort = options.sort || "recommended";
  const subType = options.subType || "all";
  const genres = options.genres || [];
  const era = options.era || "";
  const query = (options.query || "").trim();

  const queryParams = new URLSearchParams({
    category,
    page: String(page),
    limit: String(limit),
    sort,
    subType,
  });

  if (genres.length > 0) {
    queryParams.set("genres", genres.join(","));
  }
  if (era) {
    queryParams.set("era", era);
  }
  if (query) {
    queryParams.set("query", query);
  }

  const inflightKey = `${category}|p:${page}|l:${limit}|${sort}|${subType}|${genres.join(",")}|${era}|${query}`;
  if (inflightRequests.has(inflightKey)) {
    return inflightRequests.get(inflightKey)!;
  }

  const requestPromise = (async () => {
    try {
      const res = await fetch(`/api/browse?${queryParams.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} loading catalogue`);
      const json = await res.json();
      if (!json?.data) throw new Error("Empty catalogue response");
      return json.data as BrowseCatalogueResult;
    } finally {
      inflightRequests.delete(inflightKey);
    }
  })();

  inflightRequests.set(inflightKey, requestPromise);
  return requestPromise;
}

/**
 * Controlled, non-blocking background prefetch for a category (batch of 50).
 */
export async function prefetchCategory(
  category: BrowseCategory
): Promise<BrowseCatalogueResult | null> {
  const cached = getCachedCategoryData(category);
  if (cached) return null; // Already fresh in cache

  try {
    const data = await fetchCatalogueBatch(category, {
      page: 1,
      limit: BROWSE_BATCH_SIZE,
      sort: "recommended",
      subType: "all",
      genres: [],
      era: "",
      query: "",
    });

    if (data?.items) {
      setCachedCategoryData(category, {
        items: data.items,
        total: data.total,
        page: 1,
        hasMore: data.hasMore,
        availableGenres: data.availableGenres || [],
        availableEras: data.availableEras || [],
        featuredSpotlight: data.featuredSpotlight || null,
        selectedGenres: [],
        selectedEra: "",
        subType: "all",
        sort: "recommended",
        searchQuery: "",
        fetchedAt: Date.now(),
      });
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Start background preparation for all other categories in non-blocking sequence.
 */
let prefetchActive = false;
export function startBackgroundCataloguePrefetch(excludeCategory?: BrowseCategory) {
  if (prefetchActive) return;
  prefetchActive = true;

  const categories: BrowseCategory[] = (
    ["movies", "series", "anime"] as BrowseCategory[]
  ).filter((c) => c !== excludeCategory);

  // Controlled stagger: 800ms between background requests
  let delay = 600;
  for (const cat of categories) {
    setTimeout(() => {
      prefetchCategory(cat).catch(() => {});
    }, delay);
    delay += 900;
  }

  setTimeout(() => {
    prefetchActive = false;
  }, delay + 1000);
}
