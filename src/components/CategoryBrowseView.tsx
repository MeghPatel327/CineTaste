"use client";

import { useEffect, useState, useRef, useCallback, useTransition } from "react";
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
  ChevronDown,
  Sparkles,
  ArrowUpDown,
  Calendar,
  Layers,
  Star,
  Film,
  Tv,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BrowseCategory,
  BrowseItem,
  BrowseCatalogueResult,
} from "@/features/movies/browseService";

interface CategoryBrowseViewProps {
  category: BrowseCategory;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

interface CategoryCacheItem {
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
  sort: "recommended" | "rating" | "year" | "title";
  searchQuery: string;
  fetchedAt: number;
}

// Module-level persistent cache across route changes
const browseCache = new Map<BrowseCategory, CategoryCacheItem>();
const CACHE_TTL_MS = 8 * 60 * 1000;

const staggerStyle = (index: number, step = 35) =>
  ({
    "--ct-stagger-delay": `${Math.min(index, 20) * step}ms`,
  } as CSSProperties);

export function CategoryBrowseView({
  category,
  title,
  subtitle,
  icon,
}: CategoryBrowseViewProps) {
  const [, startTransition] = useTransition();

  // Restore initial state from cache if fresh
  const cached = browseCache.get(category);
  const isCacheFresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

  const [items, setItems] = useState<BrowseItem[]>(isCacheFresh ? cached.items : []);
  const [total, setTotal] = useState<number>(isCacheFresh ? cached.total : 0);
  const [page, setPage] = useState<number>(isCacheFresh ? cached.page : 1);
  const [hasMore, setHasMore] = useState<boolean>(isCacheFresh ? cached.hasMore : true);
  const [availableGenres, setAvailableGenres] = useState<string[]>(
    isCacheFresh ? cached.availableGenres : [],
  );
  const [availableEras, setAvailableEras] = useState<string[]>(
    isCacheFresh ? cached.availableEras : ["2020s", "2010s", "2000s", "1990s", "Classic"],
  );
  const [featuredSpotlight, setFeaturedSpotlight] = useState<BrowseItem | null>(
    isCacheFresh ? cached.featuredSpotlight : null,
  );

  const [initialLoading, setInitialLoading] = useState(!isCacheFresh);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [expandedNotice, setExpandedNotice] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState(isCacheFresh ? cached.searchQuery : "");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    isCacheFresh ? cached.selectedGenres : [],
  );
  const [selectedEra, setSelectedEra] = useState<string>(isCacheFresh ? cached.selectedEra : "");
  const [subType, setSubType] = useState<string>(isCacheFresh ? cached.subType : "all");
  const [sort, setSort] = useState<"recommended" | "rating" | "year" | "title">(
    isCacheFresh ? cached.sort : "recommended",
  );

  // Modal State
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    type: "movie" | "series";
  } | null>(null);

  // Refs for infinite scroll and request locking
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

  // Scroll key for session storage
  const scrollKey = `ct_scroll_${category}`;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Fetch Catalogue Function (Primary essential content)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchCatalogue = useCallback(
    async (pageNum: number, isAppend = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      if (!isAppend) {
        setInitialLoading(true);
        setError(false);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          category,
          page: String(pageNum),
          limit: "24",
          sort,
          subType,
        });

        if (selectedGenres.length > 0) {
          params.set("genres", selectedGenres.join(","));
        }
        if (selectedEra) {
          params.set("era", selectedEra);
        }
        if (searchQuery.trim()) {
          params.set("query", searchQuery.trim());
        }

        const res = await fetch(`/api/browse?${params.toString()}`);
        if (!res.ok) throw new Error("Network response not ok");

        const json = await res.json();
        const data: BrowseCatalogueResult = json.data;

        if (!data) throw new Error("Empty catalogue payload");

        startTransition(() => {
          if (isAppend) {
            // Deduplicate incoming items against existing ones
            const existingIds = new Set(itemsRef.current.map((i) => i.id));
            const freshItems = data.items.filter((i) => !existingIds.has(i.id));

            setItems((prev) => [...prev, ...freshItems]);
            setPage(pageNum);
            setHasMore(data.hasMore);
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
          }
        });

        // Update module cache
        browseCache.set(category, {
          items: isAppend ? [...itemsRef.current, ...data.items] : data.items,
          total: data.total,
          page: pageNum,
          hasMore: data.hasMore,
          availableGenres: data.availableGenres || availableGenres,
          availableEras: data.availableEras || availableEras,
          featuredSpotlight: data.featuredSpotlight || featuredSpotlight,
          selectedGenres,
          selectedEra,
          subType,
          sort,
          searchQuery,
          fetchedAt: Date.now(),
        });
      } catch (err) {
        if (!isAppend) setError(true);
        toast.error(`Could not load ${title}`);
      } finally {
        loadingRef.current = false;
        setInitialLoading(false);
        setLoadingMore(false);
      }
    },
    [category, sort, subType, selectedGenres, selectedEra, searchQuery, title],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Initial Mount & Filter Reaction
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // If not cached or filter parameters changed, fetch page 1
    if (!isCacheFresh || !isInitialMount.current) {
      fetchCatalogue(1, false);
    } else {
      // Restore scroll if fresh
      const savedPos = parseInt(sessionStorage.getItem(scrollKey) || "0", 10);
      if (savedPos > 0) {
        requestAnimationFrame(() => window.scrollTo(0, savedPos));
      }
    }
    isInitialMount.current = false;
  }, [category, sort, subType, selectedGenres, selectedEra, searchQuery]);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Non-blocking Background Prefetching for other categories
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialLoading) return;

    const timer = setTimeout(() => {
      const otherCategories: BrowseCategory[] = (
        ["movies", "series", "anime"] as BrowseCategory[]
      ).filter((c) => c !== category);

      for (const other of otherCategories) {
        if (!browseCache.has(other)) {
          fetch(`/api/browse?category=${other}&page=1&limit=24`)
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
              if (json?.data) {
                browseCache.set(other, {
                  items: json.data.items,
                  total: json.data.total,
                  page: 1,
                  hasMore: json.data.hasMore,
                  availableGenres: json.data.availableGenres || [],
                  availableEras: json.data.availableEras || [],
                  featuredSpotlight: json.data.featuredSpotlight,
                  selectedGenres: [],
                  selectedEra: "",
                  subType: "all",
                  sort: "recommended",
                  searchQuery: "",
                  fetchedAt: Date.now(),
                });
              }
            })
            .catch(() => {});
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [category, initialLoading]);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Smooth YouTube-like Continuous Infinite Scroll
  // ─────────────────────────────────────────────────────────────────────────
  const loadNextPage = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return;
    const nextPage = pageRef.current + 1;
    fetchCatalogue(nextPage, true);
  }, [fetchCatalogue]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: "650px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadNextPage]);

  // Save scroll position before unload or navigate
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(scrollKey, String(window.scrollY));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollKey]);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Multi-Select Genre Toggles
  // ─────────────────────────────────────────────────────────────────────────
  const toggleGenre = (genre: string) => {
    if (genre === "All") {
      setSelectedGenres([]);
      return;
    }
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const clearAllFilters = () => {
    setSelectedGenres([]);
    setSelectedEra("");
    setSubType("all");
    setSearchQuery("");
    setSort("recommended");
  };

  const hasAnyFilterActive =
    selectedGenres.length > 0 ||
    selectedEra !== "" ||
    subType !== "all" ||
    searchQuery.trim().length > 0 ||
    sort !== "recommended";

  return (
    <AppShell>
      <div className="page-enter min-h-screen pb-20">
        {/* ── Page Header ── */}
        <div className="p-4 md:px-8 max-w-7xl mx-auto pt-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-heading text-3xl md:text-4xl font-black text-[#F5F7F6] flex items-center gap-3">
                {icon}
                {title}
                {total > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[#A1AAA6] border border-white/[0.08]">
                    {total} titles
                  </span>
                )}
              </h1>
              <p className="text-sm text-[#A1AAA6]">{subtitle}</p>
            </div>

            {/* Quick Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
              <input
                type="text"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0D1013] border border-white/[0.08] hover:border-white/[0.15] focus:border-emerald-500/50 rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#F5F7F6] focus:outline-none focus:ring-1 focus:ring-emerald-500/30 placeholder:text-[#A1AAA6]/50 shadow-inner transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#A1AAA6] hover:text-[#F5F7F6]"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ── Multi-Select Filtering Interface Dock ── */}
          <div className="bg-[#0D1013]/90 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 space-y-4 shadow-xl">
            {/* Top Filter Controls: Sort, Era, SubType, Clear */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Sort selector */}
                <div className="flex items-center gap-1.5 bg-[#121619] border border-white/[0.08] rounded-xl px-3 py-1.5 text-[#F5F7F6]">
                  <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[#A1AAA6]">Sort:</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as any)}
                    aria-label="Sort order"
                    className="bg-transparent text-[#F5F7F6] focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="recommended" className="bg-[#121619]">Taste Match</option>
                    <option value="rating" className="bg-[#121619]">Highest Rated</option>
                    <option value="year" className="bg-[#121619]">Release Year</option>
                    <option value="title" className="bg-[#121619]">Title (A-Z)</option>
                  </select>
                </div>

                {/* Era selector */}
                <div className="flex items-center gap-1.5 bg-[#121619] border border-white/[0.08] rounded-xl px-3 py-1.5 text-[#F5F7F6]">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[#A1AAA6]">Era:</span>
                  <select
                    value={selectedEra}
                    onChange={(e) => setSelectedEra(e.target.value)}
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
                  <div className="flex items-center gap-1.5 bg-[#121619] border border-white/[0.08] rounded-xl px-3 py-1.5 text-[#F5F7F6]">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[#A1AAA6]">Format:</span>
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
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

              {/* Reset All Filters button */}
              {hasAnyFilterActive && (
                <button
                  onClick={clearAllFilters}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors ml-auto"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear all filters
                </button>
              )}
            </div>

            {/* Multi-Select Genre Chips */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-[#A1AAA6]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Filter className="w-3 h-3 text-emerald-400" />
                  Filter by Genres (multi-select):
                </span>
                {selectedGenres.length > 0 && (
                  <span className="text-emerald-400 font-semibold">
                    {selectedGenres.length} selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {/* "All" button */}
                <button
                  onClick={() => toggleGenre("All")}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                    selectedGenres.length === 0
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                      : "bg-[#121619] text-[#A1AAA6] hover:text-[#F5F7F6] border border-white/[0.06]",
                  )}
                >
                  All Genres
                </button>

                {/* Available Genres */}
                {availableGenres.map((g) => {
                  const isSelected = selectedGenres.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => toggleGenre(g)}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all shrink-0",
                        isSelected
                          ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                          : "bg-[#121619] text-[#A1AAA6] hover:text-[#F5F7F6] border border-white/[0.06] hover:border-white/[0.12]",
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Filters Pill Bar */}
            {hasAnyFilterActive && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
                <span className="text-[11px] text-[#A1AAA6]">Active:</span>
                {selectedGenres.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  >
                    {g}
                    <button
                      onClick={() => toggleGenre(g)}
                      aria-label={`Remove filter ${g}`}
                      className="hover:text-emerald-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedEra && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    Era: {selectedEra}
                    <button
                      onClick={() => setSelectedEra("")}
                      aria-label="Remove era filter"
                      className="hover:text-blue-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {subType !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    {subType === "tv" ? "Series Only" : "Movies Only"}
                    <button
                      onClick={() => setSubType("all")}
                      aria-label="Remove format filter"
                      className="hover:text-purple-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear query filter"
                      className="hover:text-amber-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* AI Discovery Auto-Expansion Notification */}
          {expandedNotice && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs shadow-md animate-fade-in">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Gemini AI discovered and added additional verified titles matching your specific filter criteria.
              </span>
            </div>
          )}
        </div>

        {/* ── Main Unified Catalogue Content ── */}
        <div className="p-4 md:px-8 max-w-7xl mx-auto mt-6">
          {initialLoading ? (
            /* Shimmer Skeleton Grid */
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
                  <Button onClick={clearAllFilters} className="bg-emerald-500 text-[#08090C] hover:bg-emerald-400 font-bold">
                    Reset All Filters
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {/* Unified Catalogue Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {items.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="ct-stagger-item ct-card-lift-wrapper"
                    style={staggerStyle(index % 24)}
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
              <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />

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
