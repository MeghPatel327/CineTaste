"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";
import { HorizontalRow, type RowItem } from "@/components/HorizontalRow";
import { MovieCard } from "@/components/MovieCard";
import { MovieCardSkeleton } from "@/components/ui/Skeleton";
import { Search, Clock, Compass, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama",
  10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy",
  10766: "Soap", 10767: "Talk", 10768: "War & Politics"
};

interface DiscoverData {
  topPicks: any[];
  genreSections: { genre: string; items: any[] }[];
  recommendedMovies: any[];
  recommendedSeries: any[];
  hiddenGems: any[];
  trending: any[];
  popularMovies: any[];
  popularSeries: any[];
  recentlyReleased: any[];
  userGenres: string[];
}

// ── Session storage key for scroll position ──────────────────────────────────
const SCROLL_KEY = "ct-discover-scroll";
const QUERY_KEY = "ct-discover-query";
const staggerStyle = (index: number, step = 50) => ({
  "--ct-stagger-delay": `${index * step}ms`,
} as CSSProperties);

export default function DiscoverPage() {
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Search state
  const [query, setQuery] = useState(() => {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem(QUERY_KEY) ?? "";
    }
    return "";
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [visibleSearchResults, setVisibleSearchResults] = useState<any[]>([]);
  const [resultsPhase, setResultsPhase] = useState<"in" | "out">("in");
  const [searching, setSearching] = useState(false);
  const isSearchMode = query.trim().length > 0;

  // Recent searches (localStorage)
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Movie details modal
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: "movie" | "series" } | null>(null);

  // Scroll position preservation
  const savedScrollPos = useRef(0);
  const hasRestoredScroll = useRef(false);
  const searchTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchDiscoverData();
    try {
      const saved = localStorage.getItem("cinetaste-recent-searches");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

  // Restore scroll position after data loads
  useEffect(() => {
    if (discoverData && !hasRestoredScroll.current) {
      hasRestoredScroll.current = true;
      const pos = parseInt(sessionStorage.getItem(SCROLL_KEY) ?? "0", 10);
      if (pos > 0) {
        requestAnimationFrame(() => {
          window.scrollTo(0, pos);
        });
      }
    }
  }, [discoverData]);

  // Persist scroll on unload / navigation
  useEffect(() => {
    const saveScroll = () => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    };
    window.addEventListener("beforeunload", saveScroll);
    return () => window.removeEventListener("beforeunload", saveScroll);
  }, []);

  // Persist query
  useEffect(() => {
    sessionStorage.setItem(QUERY_KEY, query);
  }, [query]);

  const fetchDiscoverData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/discover");
      const json = await res.json();
      if (res.ok) {
        setDiscoverData(json.data);
      } else {
        setError(true);
        toast.error("Failed to load discover data");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setVisibleSearchResults([]);
      setResultsPhase("in");
      return;
    }
    const timeout = setTimeout(() => {
      performSearch(query.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!isSearchMode) {
      setVisibleSearchResults([]);
      setResultsPhase("in");
      return;
    }

    if (searchTransitionRef.current) {
      clearTimeout(searchTransitionRef.current);
    }

    setResultsPhase("out");
    searchTransitionRef.current = setTimeout(() => {
      setVisibleSearchResults(searchResults);
      requestAnimationFrame(() => setResultsPhase("in"));
    }, 140);

    return () => {
      if (searchTransitionRef.current) {
        clearTimeout(searchTransitionRef.current);
      }
    };
  }, [searchResults, isSearchMode]);

  const performSearch = async (q: string) => {
    setSearching(true);
    setResultsPhase("out");
    try {
      const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.data || []);
        const newRecent = [q, ...recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 8);
        setRecentSearches(newRecent);
        localStorage.setItem("cinetaste-recent-searches", JSON.stringify(newRecent));
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleOpenDetails = useCallback((tmdbId: number, type: "movie" | "series") => {
    savedScrollPos.current = window.scrollY;
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    setSelectedItem({ id: tmdbId, type });
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    requestAnimationFrame(() => {
      window.scrollTo(0, savedScrollPos.current);
    });
  }, []);

  const clearRecentSearch = (term: string) => {
    const newRecent = recentSearches.filter(s => s !== term);
    setRecentSearches(newRecent);
    localStorage.setItem("cinetaste-recent-searches", JSON.stringify(newRecent));
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-7xl mx-auto page-enter">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Compass className="w-8 h-8 text-primary" /> Discover
          </h1>
          <p className="text-muted-foreground mt-1">Find your next favorite movie or series.</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search movies & series..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="ct-search-input w-full bg-card border border-border rounded-xl pl-12 pr-12 py-3.5 text-lg focus:outline-none placeholder:text-muted-foreground/50"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {searching && (
            <BrandLogo
              variant="compact"
              className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5"
              imageClassName="animate-[spin_2.5s_linear_infinite]"
            />
          )}
        </div>

        {/* Content Area */}
        {loading && !isSearchMode ? (
          <DiscoverSkeleton />
        ) : error && !isSearchMode ? (
          <ErrorState title="Failed to load" message="Couldn't load your discover feed." onRetry={fetchDiscoverData} />
        ) : isSearchMode ? (
          /* ── Search Mode ── */
          <div className="ct-results-transition" data-phase={resultsPhase}>
            {searching && visibleSearchResults.length === 0 ? (
              <BrandLogo variant="loading" className="py-20" />
            ) : visibleSearchResults.length === 0 && !searching ? (
              <EmptyState
                title={`No results found for "${query}"`}
                description="Try a different title, person, or series name."
                action={<Button variant="outline" onClick={() => setQuery("")}>Clear Search</Button>}
              />
            ) : (
              <SearchResultsGrid
                results={visibleSearchResults}
                onSelect={handleOpenDetails}
              />
            )}
          </div>
        ) : discoverData ? (
          /* ── Discovery Home ── */
          <DiscoveryFeed
            data={discoverData}
            recentSearches={recentSearches}
            onSearchClick={setQuery}
            onClearSearch={clearRecentSearch}
            onSelect={handleOpenDetails}
          />
        ) : null}
      </div>

      <MovieDetailsModal
        isOpen={!!selectedItem}
        onClose={handleCloseDetails}
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

/* ── Discover skeleton — shown while initial feed loads ─────────────────── */
function DiscoverSkeleton() {
  return (
    <div className="space-y-10">
      {[5, 7, 6, 8].map((count, i) => (
        <section key={i}>
          <div className="mb-3 space-y-1.5">
            <div className="h-5 w-48 rounded ct-shimmer" />
            {i === 0 && <div className="h-3 w-64 rounded ct-shimmer" />}
          </div>
          <div className="flex gap-4 overflow-hidden pb-3">
            {Array.from({ length: count }).map((_, j) => (
              <MovieCardSkeleton key={j} className="shrink-0" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ── Search Results Grid ─────────────────────────────────────────────────── */
function SearchResultsGrid({
  results,
  onSelect,
}: {
  results: any[];
  onSelect: (id: number, type: "movie" | "series") => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {results.map((r: any, index: number) => {
        const posterUrl = r.poster_path
          ? `https://image.tmdb.org/t/p/w342${r.poster_path}`
          : null;
        const genres = (r.genre_ids || [])
          .slice(0, 3)
          .map((id: number) => TMDB_GENRES[id])
          .filter(Boolean);

        return (
          <div key={r.id} className="ct-stagger-item" style={staggerStyle(index)}>
            <MovieCard
              id={r.id}
              title={r.title || r.name}
              posterUrl={posterUrl}
              mediaType={r.media_type === "tv" ? "tv" : "movie"}
              releaseYear={
                r.release_date
                  ? parseInt(r.release_date.split("-")[0], 10)
                  : r.first_air_date
                  ? parseInt(r.first_air_date.split("-")[0], 10)
                  : undefined
              }
              voteAverage={r.vote_average > 0 ? r.vote_average : undefined}
              genres={genres}
              onClick={onSelect}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ── Discovery Feed ──────────────────────────────────────────────────────── */
function DiscoveryFeed({
  data,
  recentSearches,
  onSearchClick,
  onClearSearch,
  onSelect,
}: {
  data: DiscoverData;
  recentSearches: string[];
  onSearchClick: (term: string) => void;
  onClearSearch: (term: string) => void;
  onSelect: (id: number, type: "movie" | "series") => void;
}) {
  const [extraBatches, setExtraBatches] = useState<RowItem[][]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const offsetRef = useRef(0);
  const seenIds = useRef<Set<number>>(new Set());
  // Mirror hasMore as state so the end-message renders
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pre-populate seenIds from initial data once
  useEffect(() => {
    const allInitial = [
      ...data.topPicks,
      ...data.genreSections.flatMap(s => s.items),
      ...data.recommendedMovies,
      ...data.recommendedSeries,
      ...data.hiddenGems,
      ...data.trending,
      ...data.popularMovies,
      ...data.popularSeries,
      ...data.recentlyReleased,
    ];
    allInitial.forEach(item => seenIds.current.add(item.movieId ?? item.id ?? 0));
    offsetRef.current =
      data.topPicks.length + data.recommendedMovies.length + data.recommendedSeries.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/recommendations?offset=${offsetRef.current}&limit=20`);
      if (!res.ok) { hasMoreRef.current = false; setHasMore(false); return; }
      const json = await res.json();
      const raw: any[] = json.data ?? json ?? [];
      const fresh: RowItem[] = raw.filter(r => !seenIds.current.has(r.movieId ?? r.id ?? 0));

      if (fresh.length === 0) {
        hasMoreRef.current = false;
        setHasMore(false);
        return;
      }
      fresh.forEach(r => seenIds.current.add(r.movieId ?? r.id ?? 0));
      offsetRef.current += fresh.length;
      setExtraBatches(prev => [...prev, fresh]);
    } catch {
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, []); // stable — uses only refs

  // Register observer once
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="ct-discovery-feed space-y-10">
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5" /> Recent Searches
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map(term => (
              <button
                key={term}
                className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 text-sm hover:border-primary hover:text-primary transition-all group"
              >
                <span onClick={() => onSearchClick(term)}>{term}</span>
                <X
                  className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onClearSearch(term); }}
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {data.topPicks.length > 0 && (
        <HorizontalRow
          title="⭐ Top Picks For You"
          subtitle="The highest quality personalized recommendations"
          items={data.topPicks}
          onSelect={onSelect}
          showScore
        />
      )}

      {data.genreSections.map(section => (
        <HorizontalRow
          key={section.genre}
          title={`🎬 Because You Like ${section.genre}`}
          items={section.items}
          onSelect={onSelect}
        />
      ))}

      {data.recommendedMovies.length > 0 && (
        <HorizontalRow
          title="🎥 Recommended Movies"
          subtitle="Movies tailored to your taste"
          items={data.recommendedMovies}
          onSelect={onSelect}
          showScore
        />
      )}

      {data.recommendedSeries.length > 0 && (
        <HorizontalRow
          title="📺 Recommended Series"
          subtitle="TV series you'll love"
          items={data.recommendedSeries}
          onSelect={onSelect}
          showScore
        />
      )}

      {data.hiddenGems.length > 0 && (
        <HorizontalRow
          title="🍿 Hidden Gems"
          subtitle="Less popular but highly recommended"
          items={data.hiddenGems}
          onSelect={onSelect}
          showScore
        />
      )}

      {data.trending.length > 0 && (
        <HorizontalRow
          title="🔥 Trending Today"
          subtitle="What's hot right now"
          items={data.trending}
          onSelect={onSelect}
        />
      )}

      {data.recentlyReleased.length > 0 && (
        <HorizontalRow
          title="🕒 Recently Released"
          subtitle="Fresh titles just for you"
          items={data.recentlyReleased}
          onSelect={onSelect}
        />
      )}

      {data.popularMovies.length > 0 && (
        <HorizontalRow
          title="🎬 Popular Movies"
          items={data.popularMovies}
          onSelect={onSelect}
        />
      )}

      {data.popularSeries.length > 0 && (
        <HorizontalRow
          title="📺 Popular Series"
          items={data.popularSeries}
          onSelect={onSelect}
        />
      )}

      {/* Extra infinite batches */}
      {extraBatches.map((batch, i) => (
        <HorizontalRow
          key={`extra-${i}`}
          title={`✨ More For You`}
          items={batch}
          onSelect={onSelect}
          showScore
        />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />

      {/* Loading indicator */}
      {loadingMore && (
        <div className="flex justify-center py-6">
          <BrandLogo
            variant="compact"
            className="w-8 h-8"
            imageClassName="animate-[spin_2.5s_linear_infinite]"
          />
        </div>
      )}

      {/* End of feed */}
      {!hasMore && (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-sm">You're all caught up! Rate more movies to improve your recommendations.</p>
        </div>
      )}
    </div>
  );
}
