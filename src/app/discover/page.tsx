"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";
import { Search, Star, Sparkles, Film, Tv, TrendingUp, Clock, Eye, Compass, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

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

export default function DiscoverPage() {
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const isSearchMode = query.trim().length > 0;

  // Recent searches (localStorage)
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Movie details modal
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: "movie" | "series" } | null>(null);

  // Scroll position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollPos = useRef(0);

  useEffect(() => {
    fetchDiscoverData();
    // Load recent searches
    try {
      const saved = localStorage.getItem("cinetaste-recent-searches");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

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
      return;
    }
    const timeout = setTimeout(() => {
      performSearch(query.trim());
    }, 500);
    return () => clearTimeout(timeout);
  }, [query]);

  const performSearch = async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.data || []);
        // Save to recent searches
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
    // Save scroll position
    savedScrollPos.current = window.scrollY;
    setSelectedItem({ id: tmdbId, type });
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    // Restore scroll position on next tick
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
      <div ref={scrollContainerRef} className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Compass className="w-8 h-8 text-primary" /> Discover
          </h1>
          <p className="text-muted-foreground mt-1">Find your next favorite movie or series.</p>
        </div>

        {/* Search Bar - Always Visible */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search movies & series..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-12 pr-12 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {searching && (
            <BrandLogo variant="compact" className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5" imageClassName="animate-[spin_2.5s_linear_infinite]" />
          )}
        </div>

        {/* Content Area */}
        {loading && !isSearchMode ? (
          <LoadingState message="Loading your personalized feed..." />
        ) : error && !isSearchMode ? (
          <ErrorState title="Failed to load" message="Couldn't load your discover feed." onRetry={fetchDiscoverData} />
        ) : isSearchMode ? (
          /* ===================== MODE B: Search Mode ===================== */
          <div>
            {searching && searchResults.length === 0 ? (
              <BrandLogo variant="loading" className="py-20" />
            ) : searchResults.length === 0 && !searching ? (
              <div className="text-center py-20 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No results found for "{query}"</p>
                <p className="text-sm mt-2">Try a different search term.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.map((r: any) => (
                  <div
                    key={r.id}
                    className="bg-card rounded-xl overflow-hidden border border-border cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                    onClick={() => handleOpenDetails(r.id, r.media_type === "tv" ? "series" : "movie")}
                  >
                    {r.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w342${r.poster_path}`}
                        alt={r.title || r.name}
                        className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-secondary flex items-center justify-center text-muted-foreground text-sm">No Poster</div>
                    )}
                    <div className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{r.title || r.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${r.media_type === "tv" ? "bg-purple-500/20 text-purple-400" : "bg-primary/20 text-primary"}`}>
                          {r.media_type === "tv" ? "Series" : "Movie"}
                        </span>
                        <span>{r.release_date?.split("-")[0] || r.first_air_date?.split("-")[0] || ""}</span>
                      </div>
                      {r.vote_average > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{r.vote_average.toFixed(1)}</span>
                        </div>
                      )}
                      {r.genre_ids && r.genre_ids.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-1">
                          {r.genre_ids.slice(0, 3).map((id: number) => TMDB_GENRES[id]).filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : discoverData ? (
          /* ===================== MODE A: Discovery Home ===================== */
          <div className="space-y-10">

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
                      <span onClick={() => setQuery(term)}>{term}</span>
                      <X
                        className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); clearRecentSearch(term); }}
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Top Picks For You */}
            {discoverData.topPicks.length > 0 && (
              <HorizontalSection
                title="⭐ Top Picks For You"
                subtitle="The highest quality personalized recommendations"
                items={discoverData.topPicks}
                onSelect={handleOpenDetails}
                showScore
              />
            )}

            {/* Because You Like {Genre} */}
            {discoverData.genreSections.map(section => (
              <HorizontalSection
                key={section.genre}
                title={`🎬 Because You Like ${section.genre}`}
                items={section.items}
                onSelect={handleOpenDetails}
              />
            ))}

            {/* Recommended Movies */}
            {discoverData.recommendedMovies.length > 0 && (
              <HorizontalSection
                title="🎥 Recommended Movies"
                subtitle="Movies tailored to your taste"
                items={discoverData.recommendedMovies}
                onSelect={handleOpenDetails}
                showScore
              />
            )}

            {/* Recommended Series */}
            {discoverData.recommendedSeries.length > 0 && (
              <HorizontalSection
                title="📺 Recommended Series"
                subtitle="TV series you'll love"
                items={discoverData.recommendedSeries}
                onSelect={handleOpenDetails}
                showScore
              />
            )}

            {/* Hidden Gems */}
            {discoverData.hiddenGems.length > 0 && (
              <HorizontalSection
                title="🍿 Hidden Gems"
                subtitle="Less popular but highly recommended"
                items={discoverData.hiddenGems}
                onSelect={handleOpenDetails}
                showScore
              />
            )}

            {/* Trending Today */}
            {discoverData.trending.length > 0 && (
              <HorizontalSection
                title="🔥 Trending Today"
                subtitle="What's hot right now"
                items={discoverData.trending}
                onSelect={handleOpenDetails}
              />
            )}

            {/* Recently Released */}
            {discoverData.recentlyReleased.length > 0 && (
              <HorizontalSection
                title="🕒 Recently Released"
                subtitle="Fresh titles just for you"
                items={discoverData.recentlyReleased}
                onSelect={handleOpenDetails}
              />
            )}

            {/* Popular Movies */}
            {discoverData.popularMovies.length > 0 && (
              <HorizontalSection
                title="🎬 Popular Movies"
                items={discoverData.popularMovies}
                onSelect={handleOpenDetails}
              />
            )}

            {/* Popular Series */}
            {discoverData.popularSeries.length > 0 && (
              <HorizontalSection
                title="📺 Popular Series"
                items={discoverData.popularSeries}
                onSelect={handleOpenDetails}
              />
            )}

            {/* End message */}
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">You're all caught up! Rate more movies to improve your recommendations.</p>
            </div>
          </div>
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

/* ===================== Horizontal Carousel Section ===================== */
function HorizontalSection({
  title,
  subtitle,
  items,
  onSelect,
  showScore,
}: {
  title: string;
  subtitle?: string;
  items: any[];
  onSelect: (id: number, type: "movie" | "series") => void;
  showScore?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar"
      >
        {items.map((item: any) => {
          const id = item.movieId || item.id;
          return (
            <div
              key={id}
              className="w-36 md:w-44 shrink-0 snap-start cursor-pointer group"
              onClick={() => onSelect(id, item.media_type === "tv" ? "series" : "movie")}
            >
              <div className="relative overflow-hidden rounded-xl">
                {(item.poster_url || item.poster_path) ? (
                  <img
                    src={item.poster_url || `https://image.tmdb.org/t/p/w342${item.poster_path}`}
                    alt={item.title}
                    className="w-full aspect-[2/3] object-cover rounded-xl group-hover:scale-105 transition-transform duration-300 shadow-md"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-secondary rounded-xl flex items-center justify-center text-xs text-muted-foreground">No Poster</div>
                )}
                {showScore && item.score && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                    {item.score}%
                  </div>
                )}
                {item.vote_average > 0 && !showScore && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {item.vote_average.toFixed(1)}
                  </div>
                )}
              </div>
              <p className="font-semibold text-sm mt-2 line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${item.media_type === "tv" ? "bg-purple-500/20 text-purple-400" : "bg-primary/20 text-primary"}`}>
                  {item.media_type === "tv" ? "Series" : "Movie"}
                </span>
                {item.release_year > 0 && (
                  <span className="text-xs text-muted-foreground">{item.release_year}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
