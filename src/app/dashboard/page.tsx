"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/ui/ErrorState";
import { AppShell } from "@/components/AppShell";
import {
  Search,
  X,
  Sparkles,
  PlayCircle,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  Award,
  CheckCircle,
  Lightbulb,
  Clock,
  Film,
  ListTodo,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";
import { MovieCard } from "@/components/MovieCard";
import { HorizontalRow, type RowItem } from "@/components/HorizontalRow";
import {
  StatCardSkeleton,
  RecPreviewSkeleton,
  WatchRowSkeleton,
  MovieCardSkeleton,
  Skeleton,
} from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/appStore";
import { startBackgroundCataloguePrefetch } from "@/features/movies/browseClientCache";
import type { UnifiedSearchResultItem } from "@/features/movies/searchService";

let dashboardCacheRef: { data: any; fetchedAt: number } | null = null;
const DASHBOARD_TTL = 60_000;
const HERO_ROTATION_MS = 7_000; // 7 seconds per slide

export default function DashboardPage() {
  const { state: appState, getDashboard } = useAppStore();
  const [data, setData] = useState<any>(
    appState.dashboardData?.data ?? dashboardCacheRef?.data ?? null
  );
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: "movie" | "series" } | null>(null);

  // Unified Search State
  const [searchQueryInput, setSearchQueryInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<UnifiedSearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatusMessage, setSearchStatusMessage] = useState<string | null>(null);
  const [searchFallbackUsed, setSearchFallbackUsed] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Scroll listener for pinned controls with hysteresis and rAF throttling
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          setIsPinned((prev) => {
            if (!prev && y > 50) return true;
            if (prev && y < 20) return false;
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
  }, []);

  const fetchDashboard = useCallback(
    async (force = false) => {
      if (!force && data) {
        // Revalidate in background if stale
        getDashboard(false)
          .then((res) => {
            if (res?.data) {
              dashboardCacheRef = { data: res.data, fetchedAt: Date.now() };
              setData(res.data);
            }
          })
          .catch(() => {});
        return;
      }

      setLoading(true);
      setError(false);
      try {
        const res = await getDashboard(force);
        if (res?.data) {
          dashboardCacheRef = { data: res.data, fetchedAt: Date.now() };
          setData(res.data);
        } else {
          if (!data) setError(true);
        }
      } catch {
        if (!data) setError(true);
        toast.error("Error loading dashboard");
      } finally {
        setLoading(false);
      }
    },
    [data, getDashboard]
  );

  useEffect(() => {
    fetchDashboard();
    startBackgroundCataloguePrefetch();
  }, [fetchDashboard]);

  const executeSearch = async (queryText: string) => {
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
      // 1. Direct TMDB multi-search across movies, series, anime (bypasses Gemini)
      const res = await fetch(
        `/api/search?query=${encodeURIComponent(q)}&category=all&fallback=false`
      );
      const resJson = await res.json();
      const results: UnifiedSearchResultItem[] = resJson?.data?.results || [];

      if (results.length > 0) {
        setSearchResults(results);
        setIsSearching(false);
        return;
      }

      // 2. Direct search produced 0 results -> Show status message and invoke Gemini fallback
      setSearchStatusMessage("CineTaste is looking for suitable alternatives...");

      const fallbackRes = await fetch(
        `/api/search?query=${encodeURIComponent(q)}&category=all&fallback=true`
      );
      const fallbackJson = await fallbackRes.json();
      const fallbackResults: UnifiedSearchResultItem[] = fallbackJson?.data?.results || [];

      setSearchResults(fallbackResults);
      setSearchFallbackUsed(fallbackJson?.data?.fallbackUsed ?? false);
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
  };

  return (
    <AppShell>
      <div className="page-enter min-h-screen">
        {/* ── Persistent Sticky Unified Search Header (Movies, Series, Anime) ── */}
        <div
          className={cn(
            "sticky z-30 transition-all duration-300 ease-out motion-reduce:transition-none",
            isPinned
              ? "top-16 md:top-3 mx-4 md:mx-auto max-w-3xl rounded-2xl bg-[#0D1013]/90 backdrop-blur-xl border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_1px_rgba(255,255,255,0.1)] px-3.5 py-2.5 sm:px-4 sm:py-3"
              : "top-14 md:top-0 w-full mx-0 rounded-none bg-[#08090C]/90 md:bg-[#08090C]/80 backdrop-blur-md border-b border-white/[0.08] border-x-0 border-t-0 px-4 md:px-12 py-3.5 shadow-none"
          )}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeSearch(searchQueryInput);
              }}
              className="flex items-center gap-2 w-full max-w-2xl"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search across Movies, Series & Anime (TMDB)..."
                  value={searchQueryInput}
                  onChange={(e) => setSearchQueryInput(e.target.value)}
                  className="w-full bg-[#0D1013] border border-white/[0.1] hover:border-white/[0.18] focus:border-emerald-500/60 rounded-xl pl-10 pr-9 py-2 text-sm text-[#F5F7F6] focus:outline-none focus:ring-1 focus:ring-emerald-500/30 placeholder:text-[#A1AAA6]/50 shadow-inner transition-colors"
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
                className="bg-emerald-500 hover:bg-emerald-400 text-[#08090C] font-bold px-4 rounded-xl shrink-0 shadow-[0_2px_12px_rgba(16,185,129,0.3)]"
              >
                Apply
              </Button>
            </form>

            {isSearchActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="text-xs text-[#A1AAA6] hover:text-[#F5F7F6]"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Close Search
              </Button>
            )}
          </div>
        </div>

        {/* ── Main View: Unified Search Results vs Dashboard Rails ── */}
        {isSearchActive ? (
          <div className="max-w-7xl mx-auto px-4 md:px-12 py-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h2 className="font-heading text-xl font-bold text-[#F5F7F6] flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-400" />
                  Search Results for "{activeSearchQuery}"
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-[#A1AAA6]">
                    {searchResults.length} {searchResults.length === 1 ? "match" : "matches"}
                  </span>
                </h2>
                {searchFallbackUsed && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Intelligent alternative matches discovered via Gemini AI & resolved on TMDB
                  </p>
                )}
              </div>
            </div>

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
                      Return to Home
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {searchResults.map((item, index) => (
                  <div key={`dash-search-${item.id}-${index}`} className="relative group">
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
                      onClick={(id, type) => setSelectedItem({ id, type })}
                    />
                    {item.fallbackMatch && (
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-emerald-500/90 text-[#08090C] text-[10px] font-bold shadow-md flex items-center gap-1 backdrop-blur-sm">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI Match
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : error && !loading && !data ? (
          <div className="p-6 md:p-12 max-w-6xl mx-auto">
            <ErrorState
              title="Dashboard failed to load"
              message="We couldn't load your cinematic dashboard. This might be a temporary issue with the server."
              onRetry={() => fetchDashboard(true)}
            />
          </div>
        ) : (
          <DashboardView
            data={data}
            loading={loading}
            onSelectMovie={(id, type) => setSelectedItem({ id, type })}
          />
        )}

        {selectedItem && (
          <MovieDetailsModal
            isOpen={true}
            tmdbId={selectedItem.id}
            type={selectedItem.type}
            onClose={() => setSelectedItem(null)}
            onUpdated={() => fetchDashboard(true)}
          />
        )}
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard View: Hero + Rails
// ─────────────────────────────────────────────────────────────────────────────
interface DashboardViewProps {
  data: any;
  loading: boolean;
  onSelectMovie: (id: number, type: "movie" | "series") => void;
}

function DashboardView({ data, loading, onSelectMovie }: DashboardViewProps) {
  const stats = data?.stats;
  const next5 = data?.next5 ?? [];
  const favoriteGenres = data?.favoriteGenres ?? [];
  const recommendationPreview = data?.recommendationPreview ?? [];
  const heroMovies = data?.heroMovies ?? recommendationPreview.slice(0, 8);
  const insights = data?.insights ?? [];

  // Hero state
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const heroTimerRef = useRef<NodeJS.Timeout | null>(null);

  const heroCount = heroMovies.length;
  const activeMovie = heroMovies[activeHeroIndex] ?? null;

  // Auto rotation
  const nextHero = useCallback(() => {
    if (heroCount <= 1) return;
    setActiveHeroIndex((prev) => (prev + 1) % heroCount);
  }, [heroCount]);

  const prevHero = useCallback(() => {
    if (heroCount <= 1) return;
    setActiveHeroIndex((prev) => (prev - 1 + heroCount) % heroCount);
  }, [heroCount]);

  useEffect(() => {
    if (isPaused || heroCount <= 1) return;

    heroTimerRef.current = setInterval(() => {
      nextHero();
    }, HERO_ROTATION_MS);

    return () => {
      if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    };
  }, [isPaused, heroCount, nextHero, activeHeroIndex]);

  // Format recommendations as RowItems
  const recRowItems: RowItem[] = recommendationPreview.map((r: any) => ({
    id: r.movieId ?? r.id,
    movieId: r.movieId ?? r.id,
    title: r.title,
    poster_url: r.poster_url,
    media_type: r.media_type ?? "movie",
    release_year: r.release_year,
    vote_average: r.vote_average,
    score: r.score,
    genres: r.genres,
  }));

  const parseGenres = (genres: any): string[] => {
    if (Array.isArray(genres)) return genres;
    if (typeof genres === "string") {
      try {
        const p = JSON.parse(genres);
        if (Array.isArray(p)) return p;
      } catch {
        return genres.split(",").map((s) => s.trim());
      }
    }
    return [];
  };

  return (
    <div className="space-y-10 pb-16">
      {/* ── 1. DOMINANT CINEMATIC HERO (approx 80vh on desktop) ── */}
      {loading ? (
        <div className="relative w-full h-[75vh] md:h-[80vh] min-h-[580px] bg-[#0D1013] animate-pulse flex items-end p-6 md:p-14">
          <div className="space-y-4 max-w-2xl">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-12 w-96 rounded-lg" />
            <Skeleton className="h-5 w-64 rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
        </div>
      ) : activeMovie ? (
        <section
          className="relative w-full h-[75vh] md:h-[80vh] min-h-[580px] overflow-hidden select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Backdrop Images with Cross-fade */}
          {heroMovies.map((movie: any, idx: number) => {
            const isCurrent = idx === activeHeroIndex;
            const bgImg = movie.backdrop_url || movie.poster_url;
            return (
              <div
                key={movie.id || movie.movieId || idx}
                className={cn(
                  "absolute inset-0 transition-opacity duration-1000 ease-out",
                  isCurrent ? "opacity-100 z-0" : "opacity-0 pointer-events-none -z-10"
                )}
              >
                {bgImg ? (
                  <img
                    src={bgImg}
                    alt={movie.title}
                    className="w-full h-full object-cover object-center scale-105 transition-transform duration-10000 ease-out transform motion-reduce:transform-none"
                    style={{
                      transform: isCurrent ? "scale(1.03)" : "scale(1)",
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#121619] to-[#08090C]" />
                )}

                {/* Obsidian Cinema Glass Multi-layered Gradients */}
                {/* 1. Deep bottom fade */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/75 to-transparent" />
                {/* 2. Left side reading vignette */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#08090C] via-[#08090C]/85 md:via-[#08090C]/70 to-transparent" />
                {/* 3. Subtle top shadow */}
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#08090C]/80 to-transparent" />
              </div>
            );
          })}

          {/* Hero Content Overlay */}
          <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 flex flex-col justify-end pb-28 md:pb-32">
            <div className="max-w-2xl md:max-w-3xl space-y-3.5">
              {/* Badge row */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  {activeMovie.score ? `${activeMovie.score}% Taste Match` : "Featured Spotlight"}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-[#A1AAA6] bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/[0.08]">
                  {activeMovie.media_type === "tv" ? "TV Series" : "Movie"}
                </span>
                {activeMovie.release_year ? (
                  <span className="text-xs font-medium text-[#A1AAA6] flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/[0.08]">
                    <Calendar className="w-3 h-3 text-[#A1AAA6]" />
                    {activeMovie.release_year}
                  </span>
                ) : null}
                {activeMovie.vote_average ? (
                  <span className="text-xs font-medium text-[#F5F7F6] flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/[0.08]">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    {Number(activeMovie.vote_average).toFixed(1)}
                  </span>
                ) : null}
              </div>

              {/* Title in Plus Jakarta Sans */}
              <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#F5F7F6] tracking-tight leading-[1.1] drop-shadow-lg line-clamp-2">
                {activeMovie.title}
              </h1>

              {/* Genre Pills */}
              {parseGenres(activeMovie.genres).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap text-xs text-[#A1AAA6]">
                  {parseGenres(activeMovie.genres).slice(0, 4).map((g: string, i: number) => (
                    <span key={i} className="text-[#A1AAA6]/90 font-medium">
                      {g}
                      {i < Math.min(parseGenres(activeMovie.genres).length, 4) - 1 ? " •" : ""}
                    </span>
                  ))}
                </div>
              )}

              {/* Overview */}
              {activeMovie.overview && (
                <p className="text-sm md:text-base text-[#A1AAA6] line-clamp-3 md:line-clamp-3 leading-relaxed max-w-2xl drop-shadow">
                  {activeMovie.overview}
                </p>
              )}

              {/* Personalized Reason (if available) */}
              {activeMovie.reasons?.[0] && (
                <p className="text-xs text-emerald-300/90 font-medium flex items-center gap-1.5 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {activeMovie.reasons[0]}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  size="default"
                  onClick={() =>
                    onSelectMovie(
                      activeMovie.id || activeMovie.movieId,
                      activeMovie.media_type === "tv" ? "series" : "movie"
                    )
                  }
                  className="bg-emerald-500 hover:bg-emerald-400 text-[#08090C] font-semibold gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.35)] px-5 py-2.5 rounded-xl transition-all"
                >
                  <Info className="w-4 h-4" />
                  View Details
                </Button>

                <Link href="/movies">
                  <Button
                    variant="outline"
                    className="border-white/[0.12] bg-[#121619]/60 backdrop-blur-md text-[#F5F7F6] hover:bg-white/[0.08] hover:border-emerald-500/40 px-5 py-2.5 rounded-xl font-medium"
                  >
                    Browse Catalogue
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* ── 7-8 Compact Thumbnail Selectors (Docked at Bottom) ── */}
          <div className="absolute bottom-5 inset-x-0 z-20 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Thumbnail Strip */}
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2">
              {heroMovies.slice(0, 8).map((movie: any, idx: number) => {
                const isSelected = idx === activeHeroIndex;
                return (
                  <button
                    key={movie.id || movie.movieId || idx}
                    onClick={() => setActiveHeroIndex(idx)}
                    className={cn(
                      "group relative flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 text-left outline-none shrink-0",
                      "bg-[#121619]/80 backdrop-blur-md border",
                      isSelected
                        ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/50 scale-105"
                        : "border-white/[0.08] hover:border-white/20 hover:bg-[#161B1F]/80 opacity-60 hover:opacity-100"
                    )}
                  >
                    {/* Poster thumbnail */}
                    {movie.poster_url ? (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-8 h-12 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-8 h-12 bg-[#0D1013] rounded-md flex items-center justify-center">
                        <Film className="w-3.5 h-3.5 text-[#A1AAA6]" />
                      </div>
                    )}

                    {/* Compact Title snippet on desktop */}
                    <div className="hidden lg:block max-w-[100px] pr-2">
                      <p className="text-[11px] font-semibold text-[#F5F7F6] truncate">
                        {movie.title}
                      </p>
                      <p className="text-[10px] text-emerald-400/90 font-mono">
                        {movie.score ? `${movie.score}% match` : movie.release_year || "Movie"}
                      </p>
                    </div>

                    {/* Progress indicator when active */}
                    {isSelected && !isPaused && (
                      <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-emerald-500 rounded-full animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Prev / Next Chevrons */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0 bg-[#121619]/80 backdrop-blur-md border border-white/[0.08] p-1 rounded-xl">
              <button
                onClick={prevHero}
                className="p-1.5 rounded-lg text-[#A1AAA6] hover:text-[#F5F7F6] hover:bg-white/[0.06] transition-colors"
                aria-label="Previous featured movie"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextHero}
                className="p-1.5 rounded-lg text-[#A1AAA6] hover:text-[#F5F7F6] hover:bg-white/[0.06] transition-colors"
                aria-label="Next featured movie"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── 2. PERSONALIZED MOVIE RAILS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 space-y-12">
        {/* Rail 1: Recommended For You */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="font-heading text-xl md:text-2xl font-bold flex items-center gap-2.5 text-[#F5F7F6]">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Personalized Recommendations
              </h2>
              <p className="text-xs text-[#A1AAA6]">
                Curated by hybrid Gemini AI + TMDB engine based on your taste profile
              </p>
            </div>

            <Link href="/movies">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                Explore Catalogue →
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <RecPreviewSkeleton key={i} />
              ))}
            </div>
          ) : recRowItems.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center">
              <EmptyState
                title="Recommendations are shaping your taste"
                description="Rate and log more movies to sharpen your AI personalized recommendations."
                action={
                  <Link href="/movies">
                    <Button size="sm" className="bg-emerald-500 text-[#08090C] hover:bg-emerald-400">
                      Browse Movies
                    </Button>
                  </Link>
                }
                compact
              />
            </div>
          ) : (
            <HorizontalRow
              title=""
              items={recRowItems}
              showScore={true}
              onSelect={(id, type) => onSelectMovie(id, type)}
            />
          )}
        </section>

        {/* Rail 2: Up Next in Queue */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="font-heading text-xl md:text-2xl font-bold flex items-center gap-2.5 text-[#F5F7F6]">
                <ListTodo className="w-5 h-5 text-emerald-400" />
                Up Next in Queue
              </h2>
              <p className="text-xs text-[#A1AAA6]">
                Your top prioritized titles queued for viewing
              </p>
            </div>

            <Link href="/recommendations">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                Manage Queue →
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <WatchRowSkeleton key={i} />
              ))}
            </div>
          ) : next5.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center">
              <EmptyState
                title="Your watch queue is empty"
                description="Add pending titles from Catalogue or Library to build your personalized watch order."
                action={
                  <Link href="/movies">
                    <Button size="sm" className="bg-emerald-500 text-[#08090C] hover:bg-emerald-400">
                      Browse Catalogue
                    </Button>
                  </Link>
                }
                compact
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {next5.map((movie: any, idx: number) => (
                <div
                  key={movie.id}
                  onClick={() =>
                    onSelectMovie(movie.tmdb_id, movie.type === "series" ? "series" : "movie")
                  }
                  className="glass-panel group relative flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer hover:border-emerald-500/50 hover:bg-[#161B1F] transition-all duration-300 hover:shadow-[0_8px_25px_rgba(0,0,0,0.5)]"
                >
                  <span className="font-heading font-extrabold text-lg text-emerald-400/80 w-6 text-center tabular-nums">
                    #{idx + 1}
                  </span>
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.movie_name}
                      className="w-14 h-20 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-14 h-20 bg-[#121619] rounded-xl flex items-center justify-center">
                      <Film className="w-4 h-4 text-[#A1AAA6]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-[#F5F7F6] truncate group-hover:text-emerald-300 transition-colors">
                      {movie.movie_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-[#A1AAA6]">
                        {movie.type === "series" ? "Series" : "Movie"}
                      </span>
                      {movie.release_year ? (
                        <span className="text-[11px] text-[#A1AAA6]">
                          {movie.release_year}
                        </span>
                      ) : null}
                    </div>
                    {movie.rating > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{movie.rating}/10</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 3. TASTE DNA & INSIGHTS ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="font-heading text-xl md:text-2xl font-bold flex items-center gap-2.5 text-[#F5F7F6]">
                <Award className="w-5 h-5 text-emerald-400" />
                Taste DNA & Library Insights
              </h2>
              <p className="text-xs text-[#A1AAA6]">
                Calculated strictly from your actual ratings and watch history
              </p>
            </div>
            <Link href="/profile">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                Profile DNA →
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : insights.length > 0 ? (
              insights.slice(0, 4).map((insight: any, i: number) => (
                <div
                  key={i}
                  className="glass-panel p-5 rounded-2xl flex flex-col items-center text-center group hover:border-emerald-500/40 hover:bg-[#161B1F] transition-all duration-300"
                >
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                    {i === 0 ? (
                      <Award className="w-5 h-5" />
                    ) : i === 1 ? (
                      <Calendar className="w-5 h-5" />
                    ) : i === 2 ? (
                      <Film className="w-5 h-5" />
                    ) : (
                      <Star className="w-5 h-5" />
                    )}
                  </div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-[#A1AAA6] mb-1">
                    {insight.title}
                  </p>
                  <p className="text-lg font-heading font-bold text-[#F5F7F6] truncate max-w-full">
                    {insight.value}
                  </p>
                  <p className="text-[11px] text-[#A1AAA6]/70 mt-1">
                    {insight.description}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full glass-panel p-6 rounded-2xl text-center">
                <EmptyState
                  title="Taste DNA in progress"
                  description="Rate more titles to unlock director, era, and genre insights."
                  compact
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
