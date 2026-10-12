"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";
import { HorizontalRow, type RowItem } from "@/components/HorizontalRow";
import { MovieCard } from "@/components/MovieCard";
import { MovieCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Search,
  X,
  Star,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BrowseCategory,
  BrowseData,
  BrowseItem,
} from "@/features/movies/browseService";

interface CategoryBrowseViewProps {
  category: BrowseCategory;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

const HERO_ROTATION_MS = 7_000;

const staggerStyle = (index: number, step = 45) =>
  ({
    "--ct-stagger-delay": `${index * step}ms`,
  } as CSSProperties);

export function CategoryBrowseView({
  category,
  title,
  subtitle,
  icon,
}: CategoryBrowseViewProps) {
  const [data, setData] = useState<BrowseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [searchResults, setSearchResults] = useState<BrowseItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    type: "movie" | "series";
  } | null>(null);

  // Hero carousel state
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const heroTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isSearchMode = searchQuery.trim().length > 0 || activeGenre !== "All";

  // ── 1. Fetch Main Browse Feed ──
  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/browse?category=${category}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      } else {
        setError(true);
        toast.error(`Failed to load ${title}`);
      }
    } catch {
      setError(true);
      toast.error(`Error connecting to ${title} service`);
    } finally {
      setLoading(false);
    }
  }, [category, title]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // ── 2. Hero Rotation ──
  const heroList = data?.featuredList ?? (data?.featured ? [data.featured] : []);
  const heroCount = heroList.length;

  const nextHero = useCallback(() => {
    if (heroCount <= 1) return;
    setActiveHeroIndex((prev) => (prev + 1) % heroCount);
  }, [heroCount]);

  const prevHero = useCallback(() => {
    if (heroCount <= 1) return;
    setActiveHeroIndex((prev) => (prev - 1 + heroCount) % heroCount);
  }, [heroCount]);

  useEffect(() => {
    if (isHeroPaused || heroCount <= 1 || isSearchMode) return;
    heroTimerRef.current = setInterval(() => {
      nextHero();
    }, HERO_ROTATION_MS);

    return () => {
      if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    };
  }, [isHeroPaused, heroCount, nextHero, isSearchMode]);

  // ── 3. Debounced Search / Live Filter ──
  useEffect(() => {
    if (!searchQuery.trim() && activeGenre === "All") {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          category,
          query: searchQuery.trim(),
          genre: activeGenre !== "All" ? activeGenre : "",
        });
        const res = await fetch(`/api/browse?${params.toString()}`);
        const json = await res.json();
        if (res.ok && json.data?.results) {
          setSearchResults(json.data.results);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [category, searchQuery, activeGenre]);

  const activeHero = heroList[activeHeroIndex] ?? null;

  return (
    <AppShell>
      <div className="page-enter min-h-screen pb-16">
        {/* ── Page Header / Search Controls Bar ── */}
        <div className="p-4 md:px-8 max-w-7xl mx-auto pt-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-extrabold text-[#F5F7F6] flex items-center gap-3">
                {icon}
                {title}
              </h1>
              <p className="text-sm text-[#A1AAA6] mt-1">{subtitle}</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
              <input
                type="text"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0D1013] border border-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#F5F7F6] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder:text-[#A1AAA6]/50 shadow-inner"
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

          {/* Quick Genre Chips */}
          {data?.genres && data.genres.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {data.genres.map((g) => {
                const isSelected = activeGenre === g;
                return (
                  <button
                    key={g}
                    onClick={() => setActiveGenre(g)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0",
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                        : "bg-[#0D1013]/80 text-[#A1AAA6] hover:text-[#F5F7F6] border border-white/[0.06] hover:border-white/[0.12]"
                    )}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Content Switch: Loading vs Error vs Search Mode vs Feed Mode ── */}
        {loading ? (
          <div className="p-4 md:px-8 max-w-7xl mx-auto space-y-10 mt-6">
            <div className="w-full h-80 rounded-2xl bg-[#0D1013] animate-pulse flex items-end p-8">
              <div className="space-y-3">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-10 w-80 rounded-lg" />
                <Skeleton className="h-4 w-60 rounded-md" />
              </div>
            </div>
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="space-y-3">
                <Skeleton className="h-6 w-48 rounded" />
                <div className="flex gap-4 overflow-hidden">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <MovieCardSkeleton key={j} className="shrink-0" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 md:p-12 max-w-4xl mx-auto">
            <ErrorState
              title={`Failed to load ${title}`}
              message="Could not load the catalog. Please verify connection and retry."
              onRetry={fetchFeed}
            />
          </div>
        ) : isSearchMode ? (
          /* ── Search / Filter Results Mode ── */
          <div className="p-4 md:px-8 max-w-7xl mx-auto mt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#A1AAA6]">
                {searching
                  ? "Searching catalog..."
                  : `Found ${searchResults.length} result${searchResults.length === 1 ? "" : "s"} for "${searchQuery || activeGenre}"`}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setActiveGenre("All");
                }}
                className="text-xs text-[#A1AAA6] hover:text-[#F5F7F6]"
              >
                Clear Filters
              </Button>
            </div>

            {searching && searchResults.length === 0 ? (
              <div className="flex justify-center py-24">
                <BrandLogo
                  variant="compact"
                  className="w-10 h-10"
                  imageClassName="animate-[spin_2.5s_linear_infinite]"
                />
              </div>
            ) : searchResults.length === 0 ? (
              <EmptyState
                title="No titles found"
                description={`Try a different title or select "All" genres.`}
                action={
                  <Button
                    onClick={() => {
                      setSearchQuery("");
                      setActiveGenre("All");
                    }}
                  >
                    Reset Search
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-4 -my-4">
                {searchResults.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="ct-stagger-item ct-card-lift-wrapper"
                    style={staggerStyle(index)}
                  >
                    <MovieCard
                      id={item.id}
                      title={item.title}
                      posterUrl={item.poster_url}
                      mediaType={item.media_type}
                      releaseYear={item.release_year}
                      voteAverage={item.vote_average}
                      genres={item.genres}
                      onClick={(id, type) => setSelectedItem({ id, type })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Main Feed Mode: Cinematic Hero + Category Rails ── */
          <div className="space-y-10 mt-4">
            {/* 1. Cinematic Spotlight Hero */}
            {activeHero && (
              <section
                className="relative w-full h-[65vh] md:h-[72vh] min-h-[500px] overflow-hidden select-none"
                onMouseEnter={() => setIsHeroPaused(true)}
                onMouseLeave={() => setIsHeroPaused(false)}
              >
                {/* Backdrop Carousel */}
                {heroList.map((hero, idx) => {
                  const isCurrent = idx === activeHeroIndex;
                  const bg = hero.backdrop_url || hero.poster_url;
                  return (
                    <div
                      key={`${hero.id}-${idx}`}
                      className={cn(
                        "absolute inset-0 transition-opacity duration-1000 ease-out",
                        isCurrent
                          ? "opacity-100 z-0"
                          : "opacity-0 pointer-events-none -z-10"
                      )}
                    >
                      {bg ? (
                        <img
                          src={bg}
                          alt={hero.title}
                          className="w-full h-full object-cover object-center scale-105 transition-transform duration-10000 ease-out transform"
                          style={{
                            transform: isCurrent ? "scale(1.03)" : "scale(1)",
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#121619] to-[#08090C]" />
                      )}

                      {/* Obsidian Glass Gradient Layers */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/75 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#08090C] via-[#08090C]/85 md:via-[#08090C]/65 to-transparent" />
                      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#08090C]/80 to-transparent" />
                    </div>
                  );
                })}

                {/* Hero Content Overlay */}
                <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 md:p-14 max-w-7xl mx-auto">
                  <div className="max-w-2xl space-y-4">
                    {/* Meta Badges */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                          activeHero.media_type === "tv"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        )}
                      >
                        {category === "anime"
                          ? activeHero.media_type === "tv"
                            ? "Anime Series"
                            : "Anime Movie"
                          : activeHero.media_type === "tv"
                          ? "TV Series"
                          : "Movie"}
                      </span>

                      {activeHero.vote_average && (
                        <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-bold text-amber-400 border border-white/[0.08]">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {activeHero.vote_average}
                        </span>
                      )}

                      {activeHero.release_year && (
                        <span className="text-xs text-[#A1AAA6] bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/[0.06]">
                          {activeHero.release_year}
                        </span>
                      )}

                      {activeHero.genres.map((g) => (
                        <span
                          key={g}
                          className="text-xs text-[#A1AAA6] hidden sm:inline-block"
                        >
                          · {g}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h2 className="font-heading text-3xl md:text-5xl font-black text-[#F5F7F6] leading-tight drop-shadow-md">
                      {activeHero.title}
                    </h2>

                    {/* Overview */}
                    {activeHero.overview && (
                      <p className="text-sm md:text-base text-[#D0D7D4] line-clamp-3 leading-relaxed drop-shadow max-w-xl">
                        {activeHero.overview}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-2">
                      <Button
                        size="lg"
                        className="bg-emerald-500 hover:bg-emerald-400 text-[#08090C] font-bold rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.35)] flex items-center gap-2"
                        onClick={() =>
                          setSelectedItem({
                            id: activeHero.id,
                            type:
                              activeHero.media_type === "tv"
                                ? "series"
                                : "movie",
                          })
                        }
                      >
                        <Info className="w-4 h-4" />
                        Inspect Details
                      </Button>
                    </div>
                  </div>

                  {/* Carousel Controls */}
                  {heroCount > 1 && (
                    <div className="flex items-center justify-between pt-6 mt-4 border-t border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        {heroList.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveHeroIndex(i)}
                            className={cn(
                              "h-1.5 rounded-full transition-all duration-300",
                              i === activeHeroIndex
                                ? "w-8 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                : "w-2 bg-white/20 hover:bg-white/40"
                            )}
                            aria-label={`Slide ${i + 1}`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={prevHero}
                          className="p-2 rounded-full bg-[#121619]/80 border border-white/[0.1] text-[#A1AAA6] hover:text-[#F5F7F6] hover:border-emerald-500/40 transition-colors"
                          aria-label="Previous slide"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={nextHero}
                          className="p-2 rounded-full bg-[#121619]/80 border border-white/[0.1] text-[#A1AAA6] hover:text-[#F5F7F6] hover:border-emerald-500/40 transition-colors"
                          aria-label="Next slide"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 2. Category Rails */}
            <div className="p-4 md:px-8 max-w-7xl mx-auto space-y-10">
              {data?.rails.map((rail) => {
                const rowItems: RowItem[] = rail.items.map((it) => ({
                  id: it.id,
                  movieId: it.id,
                  title: it.title,
                  poster_url: it.poster_url,
                  backdrop_url: it.backdrop_url,
                  media_type: it.media_type,
                  release_year: it.release_year,
                  vote_average: it.vote_average,
                  score: it.score,
                  genres: it.genres,
                }));

                return (
                  <HorizontalRow
                    key={rail.id}
                    title={rail.title}
                    subtitle={rail.subtitle}
                    items={rowItems}
                    showScore={rail.showScore}
                    accentBorder={rail.accentBorder}
                    onSelect={(id, type) => setSelectedItem({ id, type })}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── Movie / Series Details Modal ── */}
        {selectedItem && (
          <MovieDetailsModal
            isOpen={true}
            onClose={() => setSelectedItem(null)}
            tmdbId={selectedItem.id}
            type={selectedItem.type}
            onNavigate={(id, type) =>
              setSelectedItem({ id, type: type || "movie" })
            }
          />
        )}
      </div>
    </AppShell>
  );
}
