"use client";

import { useEffect, useState, useRef, useCallback, useTransition, useMemo } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";
import { MovieCard } from "@/components/MovieCard";
import { MovieCardSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Search,
  X,
  Filter,
  Check,
  Sparkles,
  ArrowUpDown,
  Calendar,
  Layers,
  RotateCcw,
  Film,
  Tv,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BrowseCategory,
  BrowseItem,
  BrowseCatalogueResult,
} from "@/features/movies/browseService";
import { matchesEra, itemHasGenre } from "@/features/movies/browseFiltering";
import {
  getCachedCategoryData,
  setCachedCategoryData,
  fetchCatalogueBatch,
  startBackgroundCataloguePrefetch,
  BROWSE_BATCH_SIZE,
} from "@/features/movies/browseClientCache";
import type { UnifiedSearchResultItem } from "@/features/movies/searchService";

interface CategoryBrowseViewProps {
  category: BrowseCategory;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

const staggerStyle = (index: number, step = 30) =>
  ({
    "--ct-stagger-delay": `${Math.min(index, 24) * step}ms`,
  } as CSSProperties);

function applyFiltersToResults<T extends UnifiedSearchResultItem>(
  results: T[],
  filters: { genres: string[]; era: string; subType: string; sort: string }
): T[] {
  let filtered = results;

  // Genre AND matching
  if (filters.genres.length > 0) {
    filtered = filtered.filter((item) =>
      filters.genres.every((g) => itemHasGenre(item.genres || [], g))
    );
  }

  // Era
  if (filters.era) {
    filtered = filtered.filter((item) => matchesEra(item.release_year, filters.era));
  }

  // SubType (anime page: movie vs tv)
  if (filters.subType && filters.subType !== "all") {
    filtered = filtered.filter((item) => item.media_type === filters.subType);
  }

  // Sort
  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (filters.sort === "rating") return (b.vote_average || 0) - (a.vote_average || 0);
    if (filters.sort === "year") return (b.release_year || 0) - (a.release_year || 0);
    if (filters.sort === "year-asc") return (a.release_year || 0) - (b.release_year || 0);
    if (filters.sort === "title") return a.title.localeCompare(b.title);
    if (filters.sort === "title-desc") return b.title.localeCompare(a.title);
    return (b.score || 0) - (a.score || 0);
  });

  return sorted;
}

export function CategoryBrowseView({
  category,
  title,
  subtitle,
  icon,
}: CategoryBrowseViewProps) {
  const [, startTransition] = useTransition();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Separate Draft vs Applied Filters (Explicit Apply Pattern)
  // ─────────────────────────────────────────────────────────────────────────
  const [draftGenres, setDraftGenres] = useState<string[]>([]);
  const [draftEra, setDraftEra] = useState<string>("");
  const [draftSubType, setDraftSubType] = useState<string>("all");
  const [draftSort, setDraftSort] = useState<
    "recommended" | "rating" | "year" | "year-asc" | "title" | "title-desc"
  >("recommended");

  const [appliedGenres, setAppliedGenres] = useState<string[]>([]);
  const [appliedEra, setAppliedEra] = useState<string>("");
  const [appliedSubType, setAppliedSubType] = useState<string>("all");
  const [appliedSort, setAppliedSort] = useState<
    "recommended" | "rating" | "year" | "year-asc" | "title" | "title-desc"
  >("recommended");

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Search State (Independent from Filters, TMDB direct + Gemini fallback)
  // ─────────────────────────────────────────────────────────────────────────
  const [searchQueryInput, setSearchQueryInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<UnifiedSearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatusMessage, setSearchStatusMessage] = useState<string | null>(null);
  const [searchFallbackUsed, setSearchFallbackUsed] = useState(false);

  // Check if draft filters differ from applied
  const hasUnappliedFilterChanges =
    draftSort !== appliedSort ||
    draftEra !== appliedEra ||
    draftSubType !== appliedSubType ||
    draftGenres.length !== appliedGenres.length ||
    draftGenres.some((g) => !appliedGenres.includes(g)) ||
    (searchQueryInput.trim() !== "" && !isSearchActive) ||
    (searchQueryInput.trim() !== "" && searchQueryInput.trim() !== activeSearchQuery);

  // Derived: apply committed filters to raw search results
  const filteredSearchResults = useMemo(
    () =>
      isSearchActive
        ? applyFiltersToResults(searchResults, {
            genres: appliedGenres,
            era: appliedEra,
            subType: appliedSubType,
            sort: appliedSort,
          })
        : [],
    [searchResults, isSearchActive, appliedGenres, appliedEra, appliedSubType, appliedSort]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Stale-While-Revalidate (SWR) Catalogue Data State
  // ─────────────────────────────────────────────────────────────────────────
  const initialCache = getCachedCategoryData(category, undefined, true);
  const [items, setItems] = useState<BrowseItem[]>(initialCache?.items || []);
  const [total, setTotal] = useState<number>(initialCache?.total || 0);
  const [page, setPage] = useState<number>(initialCache?.page || 1);
  const [hasMore, setHasMore] = useState<boolean>(initialCache?.hasMore ?? true);
  const [availableGenres, setAvailableGenres] = useState<string[]>(
    initialCache?.availableGenres || []
  );
  const [availableEras, setAvailableEras] = useState<string[]>(
    initialCache?.availableEras || ["2020s", "2010s", "2000s", "1990s", "1980s", "Classic"]
  );
  const [featuredSpotlight, setFeaturedSpotlight] = useState<BrowseItem | null>(
    initialCache?.featuredSpotlight || null
  );

  const [initialLoading, setInitialLoading] = useState(!initialCache);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [expandedNotice, setExpandedNotice] = useState(false);

  // Pinned Viewport-Fixed state for search and filter controls
  const [isPinned, setIsPinned] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const isPinnedRef = useRef(isPinned);
  isPinnedRef.current = isPinned;

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const measure = () => {
      if (!isPinnedRef.current) {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0) {
          setHeaderHeight(rect.height);
        }
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Modal State
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    type: "movie" | "series";
  } | null>(null);

  // Refs for infinite scroll, concurrency locking, and scroll restoration
  const reqIdRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const pageRef = useRef(page);
  pageRef.current = page;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const savedScrollPos = useRef(0);
  const isInitialMount = useRef(true);

  const scrollKey = `ct_scroll_${category}`;

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Fetch Catalogue Function with Robust SWR and Error Recovery
  // ─────────────────────────────────────────────────────────────────────────
  const fetchCatalogue = useCallback(
    async (
      pageNum: number,
      isAppend = false,
      isBackgroundRevalidation = false,
      overrideFilters?: {
        sort?: string;
        subType?: string;
        genres?: string[];
        era?: string;
      }
    ) => {
      if (isAppend && loadingRef.current) return;
      loadingRef.current = true;
      const currentReqId = ++reqIdRef.current;

      const activeSort = overrideFilters?.sort ?? appliedSort;
      const activeSubType = overrideFilters?.subType ?? appliedSubType;
      const activeGenres = overrideFilters?.genres ?? appliedGenres;
      const activeEra = overrideFilters?.era ?? appliedEra;

      if (!isAppend && !isBackgroundRevalidation) {
        setInitialLoading(true);
        setError(false);
      } else if (isAppend) {
        setLoadingMore(true);
      }

      try {
        const filterOpts = {
          sort: activeSort,
          subType: activeSubType,
          genres: activeGenres,
          era: activeEra,
          query: "", // Catalogue browsing kept independent from search query
        };

        const data: BrowseCatalogueResult = await fetchCatalogueBatch(category, {
          page: pageNum,
          limit: BROWSE_BATCH_SIZE,
          ...filterOpts,
        });

        if (currentReqId !== reqIdRef.current) return;

        startTransition(() => {
          if (currentReqId !== reqIdRef.current) return;
          if (isAppend) {
            // Deduplicate incoming items against existing ones by canonical ID
            const existingIds = new Set(itemsRef.current.map((i) => i.id));
            const freshItems = data.items.filter((i) => !existingIds.has(i.id));
            const merged = [...itemsRef.current, ...freshItems];

            setItems(merged);
            setPage(pageNum);
            setHasMore(data.hasMore);

            setCachedCategoryData(
              category,
              {
                items: merged,
                total: Math.max(data.total, merged.length),
                page: pageNum,
                hasMore: data.hasMore,
                availableGenres: data.availableGenres?.length ? data.availableGenres : availableGenres,
                availableEras: data.availableEras?.length ? data.availableEras : availableEras,
                featuredSpotlight: data.featuredSpotlight || featuredSpotlight,
                selectedGenres: activeGenres,
                selectedEra: activeEra,
                subType: activeSubType,
                sort: activeSort,
                searchQuery: "",
                fetchedAt: Date.now(),
              },
              filterOpts
            );
          } else {
            setItems(data.items);
            setPage(1);
            setTotal(data.total);
            setHasMore(data.hasMore);
            if (data.availableGenres?.length) setAvailableGenres(data.availableGenres);
            if (data.availableEras?.length) setAvailableEras(data.availableEras);
            setFeaturedSpotlight(data.featuredSpotlight);

            if (data.expanded) {
              setExpandedNotice(true);
              setTimeout(() => setExpandedNotice(false), 5000);
            }

            setCachedCategoryData(
              category,
              {
                items: data.items,
                total: data.total,
                page: 1,
                hasMore: data.hasMore,
                availableGenres: data.availableGenres || availableGenres,
                availableEras: data.availableEras || availableEras,
                featuredSpotlight: data.featuredSpotlight,
                selectedGenres: activeGenres,
                selectedEra: activeEra,
                subType: activeSubType,
                sort: activeSort,
                searchQuery: "",
                fetchedAt: Date.now(),
              },
              filterOpts
            );
          }
        });
      } catch (err: any) {
        if (currentReqId !== reqIdRef.current) return;
        // Never replace valid cached content with empty/error during background revalidation
        if (!isAppend && !isBackgroundRevalidation && itemsRef.current.length === 0) {
          setError(true);
        }
        if (!isBackgroundRevalidation) {
          toast.error(`Could not load ${title}`);
        }
      } finally {
        if (currentReqId === reqIdRef.current) {
          loadingRef.current = false;
          setInitialLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [category, appliedSort, appliedSubType, appliedGenres, appliedEra, title, availableGenres, availableEras, featuredSpotlight]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Initial Mount & Background SWR
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const cached = getCachedCategoryData(category, undefined, true);
    if (!cached) {
      fetchCatalogue(1, false, false);
    } else {
      // Instantly restore from cache
      setItems(cached.items);
      setTotal(cached.total);
      setHasMore(cached.hasMore);
      if (cached.availableGenres?.length) setAvailableGenres(cached.availableGenres);
      if (cached.availableEras?.length) setAvailableEras(cached.availableEras);
      setInitialLoading(false);

      // Restore scroll position
      const savedPos = parseInt(sessionStorage.getItem(scrollKey) || "0", 10);
      if (savedPos > 0) {
        requestAnimationFrame(() => window.scrollTo(0, savedPos));
      }

      // If stale, revalidate in background without blocking interaction
      if (cached.isStale) {
        fetchCatalogue(1, false, true);
      }
    }
    isInitialMount.current = false;
  }, [category, fetchCatalogue, scrollKey]);

  // Non-blocking Background Prefetching for other categories
  useEffect(() => {
    if (initialLoading) return;
    startBackgroundCataloguePrefetch(category);
  }, [category, initialLoading]);

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Scroll Listener for Pinned Controls and Infinite Scroll
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      const scrollY = window.scrollY;
      sessionStorage.setItem(scrollKey, String(scrollY));

      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsPinned((prev) => {
            if (!prev && scrollY > 50) return true;
            if (prev && scrollY < 20) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    if (window.scrollY > 50) setIsPinned(true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollKey]);

  const loadNextPage = useCallback(() => {
    if (isSearchActive || loadingRef.current || !hasMoreRef.current) return;
    const nextPage = pageRef.current + 1;
    fetchCatalogue(nextPage, true);
  }, [isSearchActive, fetchCatalogue]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || isSearchActive) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: "800px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadNextPage, isSearchActive]);

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Filter Actions: Draft Toggle, Apply Button, Clear All
  // ─────────────────────────────────────────────────────────────────────────
  const toggleDraftGenre = (genre: string) => {
    if (genre === "All") {
      setDraftGenres([]);
      return;
    }
    setDraftGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleApplyFilters = () => {
    setAppliedGenres(draftGenres);
    setAppliedEra(draftEra);
    setAppliedSubType(draftSubType);
    setAppliedSort(draftSort);

    const trimmedInput = searchQueryInput.trim();

    // Combine active search query with applied filters
    if (trimmedInput) {
      executeSearch(trimmedInput);
    } else {
      if (isSearchActive) {
        setIsSearchActive(false);
        setActiveSearchQuery("");
        setSearchResults([]);
        setSearchStatusMessage(null);
      }
      fetchCatalogue(1, false, false, {
        genres: draftGenres,
        era: draftEra,
        subType: draftSubType,
        sort: draftSort,
      });
    }
  };

  const handleResetFilters = () => {
    setDraftGenres([]);
    setDraftEra("");
    setDraftSubType("all");
    setDraftSort("recommended");

    setAppliedGenres([]);
    setAppliedEra("");
    setAppliedSubType("all");
    setAppliedSort("recommended");

    // Reset filters only — search query persists.
    if (!isSearchActive) {
      fetchCatalogue(1, false, false, {
        genres: [],
        era: "",
        subType: "all",
        sort: "recommended",
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Unified TMDB Search with Intelligent Gemini Fallback Execution
  // ─────────────────────────────────────────────────────────────────────────
  const executeSearch = async (queryText: string, forceFallback = false) => {
    const q = queryText.trim();
    if (!q) {
      handleClearSearch();
      return;
    }

    setIsSearchActive(true);
    setActiveSearchQuery(q);
    setIsSearching(true);
    setSearchStatusMessage(null);
    setSearchFallbackUsed(false);

    try {
      // 1. Direct TMDB search (initial, bypasses Gemini)
      const res = await fetch(
        `/api/search?query=${encodeURIComponent(q)}&category=${category}&fallback=false`
      );
      const data = await res.json();
      const results: UnifiedSearchResultItem[] = data?.data?.results || [];

      if (results.length > 0) {
        setSearchResults(results);
        setIsSearching(false);
        return;
      }

      // 2. Direct search produced 0 results -> Show temporary status message & invoke Gemini fallback
      setSearchStatusMessage("CineTaste is looking for suitable alternatives...");

      const fallbackRes = await fetch(
        `/api/search?query=${encodeURIComponent(q)}&category=${category}&fallback=true`
      );
      const fallbackData = await fallbackRes.json();
      const fallbackResults: UnifiedSearchResultItem[] = fallbackData?.data?.results || [];

      setSearchResults(fallbackResults);
      setSearchFallbackUsed(fallbackData?.data?.fallbackUsed ?? false);
    } catch {
      toast.error("Search failed. Please retry.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setSearchStatusMessage(null);
    }
  };

  const handleClearSearch = () => {
    setIsSearchActive(false);
    setActiveSearchQuery("");
    setSearchQueryInput("");
    setSearchResults([]);
    setSearchStatusMessage(null);

    // Keep applied filters intact, refresh catalogue with current applied filters
    fetchCatalogue(1, false, false, {
      genres: appliedGenres,
      era: appliedEra,
      subType: appliedSubType,
      sort: appliedSort,
    });
  };

  const hasAnyActiveFilter =
    appliedGenres.length > 0 ||
    appliedEra !== "" ||
    appliedSubType !== "all" ||
    appliedSort !== "recommended";

  return (
    <AppShell>
      <div className="min-h-screen pb-20">
        {/* Layout Spacer to guarantee exact content offset and prevent layout jump */}
        <div
          style={{ height: headerHeight ? `${headerHeight}px` : undefined }}
          className={cn("w-full transition-[height] duration-150 ease-out", !headerHeight && "min-h-[165px]")}
          aria-hidden="true"
        />

        {/* ── Persistent, Animated Viewport-Fixed Search and Filter Controls ── */}
        <div
          ref={headerRef}
          style={{
            left: "var(--sidebar-width, 0px)",
          }}
          className={cn(
            "fixed right-0 z-[100] transition-[left,top,padding] duration-300 ease-out motion-reduce:transition-none",
            isPinned
              ? "top-16 md:top-3 px-3 sm:px-6 md:px-8 pointer-events-none"
              : "top-14 md:top-0 px-0 pointer-events-auto"
          )}
        >
          <div
            className={cn(
              "transition-all duration-300 ease-out motion-reduce:transition-none pointer-events-auto",
              isPinned
                ? "mx-auto max-w-7xl rounded-2xl bg-[#0B0E11]/90 backdrop-blur-xl border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_1px_rgba(255,255,255,0.1)] p-2.5 sm:p-3"
                : "w-full mx-0 rounded-none bg-[#08090C]/95 backdrop-blur-md border-b border-white/[0.08] border-x-0 border-t-0 px-4 md:px-8 py-3.5 sm:py-4 shadow-none"
            )}
          >
            <div className={cn("mx-auto", isPinned ? "w-full space-y-2" : "max-w-7xl space-y-3")}>
            {/* Top Bar: Title + Unified Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={cn("transition-transform duration-300 motion-reduce:transition-none shrink-0", isPinned ? "scale-75" : "scale-100")}>
                  {icon}
                </div>
                <div>
                  <h1
                    className={cn(
                      "font-heading font-extrabold text-[#F5F7F6] flex items-center gap-2 transition-all duration-300 motion-reduce:transition-none",
                      isPinned ? "text-base sm:text-lg" : "text-2xl md:text-3xl"
                    )}
                  >
                    {title}
                    {total > 0 && !isSearchActive && (
                      <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-[#A1AAA6] border border-white/[0.08]">
                        {total} titles
                      </span>
                    )}
                  </h1>
                  {!isPinned && <p className="text-xs text-[#A1AAA6] hidden sm:block">{subtitle}</p>}
                </div>
              </div>

              {/* Unified TMDB Search Bar with Apply Button */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeSearch(searchQueryInput);
                }}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <div className={cn("relative flex-1 transition-all duration-300", isPinned ? "sm:w-72" : "sm:w-80")}>
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={`Search ${title.toLowerCase()} (TMDB)...`}
                    value={searchQueryInput}
                    onChange={(e) => setSearchQueryInput(e.target.value)}
                    className={cn(
                      "w-full bg-[#0D1013] border border-white/[0.1] hover:border-white/[0.18] focus:border-emerald-500/60 rounded-xl pl-10 pr-9 text-sm text-[#F5F7F6] focus:outline-none focus:ring-1 focus:ring-emerald-500/30 placeholder:text-[#A1AAA6]/50 shadow-inner transition-all",
                      isPinned ? "py-1.5 text-xs sm:text-sm" : "py-2"
                    )}
                  />
                  {searchQueryInput && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A1AAA6] hover:text-[#F5F7F6]"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <Button
                  type="submit"
                  size="sm"
                  className={cn(
                    "bg-emerald-500 hover:bg-emerald-400 text-[#08090C] font-bold px-4 rounded-xl shrink-0 shadow-[0_2px_12px_rgba(16,185,129,0.3)] transition-all",
                    isPinned ? "h-8 text-xs" : "h-9"
                  )}
                >
                  Search
                </Button>
              </form>
            </div>

            {/* Filter Dock (With Explicit Apply Button & Multi-Genre AND Matching) */}
            <div
              className={cn(
                "transition-all duration-300 ease-out",
                isPinned
                  ? "pt-2 border-t border-white/[0.07] space-y-2"
                  : "pt-3 border-t border-white/[0.07] bg-transparent rounded-none border-x-0 border-b-0 shadow-none p-0 space-y-2.5"
              )}
            >
              {/* Row 1: Sort, Era, Format, Apply Button, Clear */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Sort selector */}
                  <div className="flex items-center gap-1.5 bg-[#121619] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-[#F5F7F6]">
                    <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[#A1AAA6]">Sort:</span>
                    <select
                      value={draftSort}
                      onChange={(e) => setDraftSort(e.target.value as any)}
                      aria-label="Sort order"
                      className="bg-transparent text-[#F5F7F6] focus:outline-none font-medium cursor-pointer"
                    >
                      <option value="recommended" className="bg-[#121619]">Taste Match</option>
                      <option value="rating" className="bg-[#121619]">Highest Rated</option>
                      <option value="year" className="bg-[#121619]">Newest First</option>
                      <option value="year-asc" className="bg-[#121619]">Oldest First</option>
                      <option value="title" className="bg-[#121619]">Title (A-Z)</option>
                      <option value="title-desc" className="bg-[#121619]">Title (Z-A)</option>
                    </select>
                  </div>

                  {/* Era selector */}
                  <div className="flex items-center gap-1.5 bg-[#121619] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-[#F5F7F6]">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[#A1AAA6]">Era:</span>
                    <select
                      value={draftEra}
                      onChange={(e) => setDraftEra(e.target.value)}
                      aria-label="Release era filter"
                      className="bg-transparent text-[#F5F7F6] focus:outline-none font-medium cursor-pointer"
                    >
                      <option value="" className="bg-[#121619]">All Eras</option>
                      {availableEras.map((era) => (
                        <option key={era} value={era} className="bg-[#121619]">
                          {era}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SubType selector (Anime only) */}
                  {category === "anime" && (
                    <div className="flex items-center gap-1.5 bg-[#121619] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-[#F5F7F6]">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[#A1AAA6]">Format:</span>
                      <select
                        value={draftSubType}
                        onChange={(e) => setDraftSubType(e.target.value)}
                        aria-label="Anime format"
                        className="bg-transparent text-[#F5F7F6] focus:outline-none font-medium cursor-pointer"
                      >
                        <option value="all" className="bg-[#121619]">All Anime</option>
                        <option value="tv" className="bg-[#121619]">Anime Series</option>
                        <option value="movie" className="bg-[#121619]">Anime Movies</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Explicit Apply Button & Reset */}
                <div className="flex items-center gap-2 ml-auto">
                  {hasUnappliedFilterChanges && (
                    <span className="text-[11px] text-amber-400 font-medium hidden sm:inline">
                      Unapplied changes
                    </span>
                  )}

                  <Button
                    onClick={handleApplyFilters}
                    size="sm"
                    className={cn(
                      "font-bold text-xs gap-1.5 rounded-xl px-4 py-1.5 transition-all shadow-md",
                      hasUnappliedFilterChanges
                        ? "bg-emerald-500 hover:bg-emerald-400 text-[#08090C] shadow-[0_0_15px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400"
                        : "bg-[#161B1F] text-[#F5F7F6] hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/[0.1]"
                    )}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply Filters
                  </Button>

                  {(hasAnyActiveFilter || hasUnappliedFilterChanges) && (
                    <button
                      onClick={handleResetFilters}
                      className="text-[#A1AAA6] hover:text-[#F5F7F6] text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/[0.04] transition-colors"
                      title="Reset all filters to defaults"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Multi-Select Genre Chips (AND matching) */}
              <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-[11px] text-[#A1AAA6]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Filter className="w-3 h-3 text-emerald-400" />
                    Filter by Genres (select multiple, matches all together):
                  </span>
                  {draftGenres.length > 0 && (
                    <span className="text-emerald-400 font-semibold">
                      {draftGenres.length} selected (AND match)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {/* All Genres chip */}
                  <button
                    onClick={() => toggleDraftGenre("All")}
                    className={cn(
                      "px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                      draftGenres.length === 0
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        : "bg-[#121619] text-[#A1AAA6] hover:text-[#F5F7F6] border border-white/[0.06]"
                    )}
                  >
                    All Genres
                  </button>

                  {/* Available genres */}
                  {availableGenres.map((g) => {
                    const isSelected = draftGenres.includes(g);
                    return (
                      <button
                        key={g}
                        onClick={() => toggleDraftGenre(g)}
                        className={cn(
                          "px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all shrink-0",
                          isSelected
                            ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                            : "bg-[#121619] text-[#A1AAA6] hover:text-[#F5F7F6] border border-white/[0.06] hover:border-white/[0.12]"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Applied Filters Summary Pills */}
              {hasAnyActiveFilter && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-white/[0.06] text-[11px]">
                  <span className="text-[#A1AAA6]">Applied:</span>
                  {appliedGenres.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    >
                      {g}
                    </span>
                  ))}
                  {appliedEra && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      Era: {appliedEra}
                    </span>
                  )}
                  {appliedSubType !== "all" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30">
                      {appliedSubType === "tv" ? "Series Only" : "Movies Only"}
                    </span>
                  )}
                  {appliedSort !== "recommended" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Sort: {appliedSort}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Status notification for AI auto-expansion */}
            {expandedNotice && (
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs shadow-md animate-fade-in">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Gemini AI discovered and added additional verified titles matching your specific filter criteria.
                </span>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* ── Main View: Search Results vs Catalogue Grid ── */}
        <div className="p-4 md:px-8 max-w-7xl mx-auto mt-2 page-enter">
          {isSearchActive ? (
            /* ── Search Results View (filtered by applied filters) ── */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="space-y-1">
                  <h2 className="font-heading text-lg md:text-xl font-bold text-[#F5F7F6] flex items-center gap-2">
                    <Search className="w-4 h-4 text-emerald-400" />
                    Search Results for &ldquo;{activeSearchQuery}&rdquo;
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-[#A1AAA6]">
                      {filteredSearchResults.length}{hasAnyActiveFilter ? ` of ${searchResults.length}` : ""} {filteredSearchResults.length === 1 ? "match" : "matches"}
                    </span>
                  </h2>
                  {searchFallbackUsed && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Intelligent alternative matches discovered via Gemini AI &amp; resolved on TMDB
                    </p>
                  )}
                  {hasAnyActiveFilter && (
                    <p className="text-[11px] text-[#A1AAA6] flex items-center gap-1">
                      <Filter className="w-3 h-3 text-emerald-400" />
                      Filters applied to search results
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSearch}
                  className="text-xs border-white/[0.1] text-[#A1AAA6] hover:text-[#F5F7F6] rounded-xl"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Close Search
                </Button>
              </div>

              {/* Temporary status message when falling back */}
              {searchStatusMessage && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm animate-pulse shadow-md">
                  <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
                  <span>{searchStatusMessage}</span>
                </div>
              )}

              {isSearching ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <MovieCardSkeleton key={i} />
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-16">
                  <EmptyState
                    title={`No titles found for "${activeSearchQuery}"`}
                    description="No direct TMDB or AI alternative matches were found. Try searching with different keywords."
                    action={
                      <Button
                        onClick={handleClearSearch}
                        className="bg-emerald-500 text-[#08090C] hover:bg-emerald-400 font-bold"
                      >
                        Return to Catalogue
                      </Button>
                    }
                  />
                </div>
              ) : filteredSearchResults.length === 0 ? (
                /* Raw TMDB results exist but none pass current filters */
                <div className="py-16">
                  <EmptyState
                    title={`No results match your filters`}
                    description={`Found ${searchResults.length} result${searchResults.length === 1 ? "" : "s"} for "${activeSearchQuery}" but none match your current filter criteria. Try adjusting your filters or reset them.`}
                    action={
                      <div className="flex gap-3">
                        <Button
                          onClick={() => {
                            setDraftGenres([]);
                            setDraftEra("");
                            setDraftSubType("all");
                            setDraftSort("recommended");
                            setAppliedGenres([]);
                            setAppliedEra("");
                            setAppliedSubType("all");
                            setAppliedSort("recommended");
                          }}
                          variant="outline"
                          className="border-white/[0.1] text-[#A1AAA6] hover:text-[#F5F7F6]"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          Reset Filters
                        </Button>
                        <Button
                          onClick={() => executeSearch(activeSearchQuery, true)}
                          className="bg-emerald-500 text-[#08090C] hover:bg-emerald-400 font-bold"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          Try AI Alternatives
                        </Button>
                      </div>
                    }
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredSearchResults.map((item, index) => (
                    <div
                      key={`search-${item.id}-${index}`}
                      className="ct-stagger-item ct-card-lift-wrapper"
                      style={staggerStyle(index % 30)}
                    >
                      <div className="relative">
                        <MovieCard
                          id={item.id}
                          title={item.title}
                          posterUrl={item.poster_url}
                          mediaType={item.media_type}
                          releaseYear={item.release_year}
                          voteAverage={item.vote_average}
                          score={item.score}
                          showScore={true}
                          genres={item.genres}
                          onClick={(id, type) => {
                            savedScrollPos.current = window.scrollY;
                            setSelectedItem({ id, type });
                          }}
                        />
                        {item.fallbackMatch && (
                          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-emerald-500/90 text-[#08090C] text-[10px] font-bold shadow-md flex items-center gap-1 backdrop-blur-sm">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI Match
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── Normal Catalogue Grid (Filtered & Continuous Infinite Scroll) ── */
            <>
              {initialLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <MovieCardSkeleton key={i} />
                  ))}
                </div>
              ) : error ? (
                <div className="py-12">
                  <ErrorState
                    title={`Failed to load ${title}`}
                    message="Could not load the catalogue. Please check connection and retry."
                    onRetry={() => fetchCatalogue(1, false)}
                  />
                </div>
              ) : items.length === 0 ? (
                <div className="py-16">
                  <EmptyState
                    title="No titles match your filters"
                    description="Try loosening your filters or resetting to view the full catalogue."
                    action={
                      <Button
                        onClick={handleResetFilters}
                        className="bg-emerald-500 text-[#08090C] hover:bg-emerald-400 font-bold"
                      >
                        Reset All Filters
                      </Button>
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {items.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="ct-stagger-item ct-card-lift-wrapper"
                        style={staggerStyle(index % 50)}
                      >
                        <MovieCard
                          id={item.id}
                          title={item.title}
                          posterUrl={item.poster_url}
                          mediaType={item.media_type}
                          releaseYear={item.release_year}
                          voteAverage={item.vote_average}
                          score={item.score}
                          showScore={true}
                          genres={item.genres}
                          onClick={(id, type) => {
                            savedScrollPos.current = window.scrollY;
                            sessionStorage.setItem(scrollKey, String(window.scrollY));
                            setSelectedItem({ id, type });
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Infinite Scroll Sentinel */}
                  <div ref={sentinelRef} className="h-6 w-full my-4" aria-hidden="true" />

                  {/* Loading More Indicator */}
                  {loadingMore && (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <BrandLogo
                        variant="compact"
                        className="w-8 h-8"
                        imageClassName="animate-[spin_2s_linear_infinite]"
                      />
                      <span className="text-xs text-[#A1AAA6]">Loading more {title.toLowerCase()}...</span>
                    </div>
                  )}

                  {/* End of Catalogue Footer */}
                  {!hasMore && items.length > 0 && (
                    <div className="text-center py-14 border-t border-white/[0.06] mt-10 space-y-2">
                      <p className="text-sm font-semibold text-[#D0D7D4]">
                        You've reached the end of the {title} catalogue.
                      </p>
                      <p className="text-xs text-[#A1AAA6]">
                        Rate more titles in your library to help CineTaste discover even more gems.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Movie / Series Details Modal */}
      <MovieDetailsModal
        isOpen={!!selectedItem}
        onClose={() => {
          setSelectedItem(null);
          requestAnimationFrame(() => {
            window.scrollTo(0, savedScrollPos.current);
          });
        }}
        tmdbId={selectedItem?.id || 0}
        type={selectedItem?.type || "movie"}
        onNavigate={(id, type) => {
          savedScrollPos.current = window.scrollY;
          setSelectedItem({ id, type: type || "movie" });
        }}
      />
    </AppShell>
  );
}
