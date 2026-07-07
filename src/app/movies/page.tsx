"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { MovieRow } from "@/features/movies/movieRepository";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LibraryCardSkeleton } from "@/components/ui/Skeleton";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { Plus, Search, ArrowUp, ArrowDown } from "lucide-react";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";

const staggerStyle = (index: number, step = 50) => ({
  "--ct-stagger-delay": `${index * step}ms`,
} as CSSProperties);

export default function MovieLibraryPage() {
  const [movies, setMovies] = useState<MovieRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("added_desc");
  
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: "movie" | "series" } | null>(null);

  useEffect(() => {
    fetchMoviesAndSites();
  }, []);

  const fetchMoviesAndSites = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/movies");
      if (res.ok) setMovies((await res.json()).data);
      else throw new Error("Failed to load movies");
    } catch {
      setError(true);
      toast.error("Error loading library");
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (e: React.MouseEvent, id: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    const pendingMovies = [...movies]
      .filter(m => m.status === 'pending')
      .sort((a, b) => (a.watch_order_rank || 0) - (b.watch_order_rank || 0));
    
    const currentIndex = pendingMovies.findIndex(m => m.id === id);
    if (currentIndex === -1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= pendingMovies.length) return;
    
    const currentMovie = pendingMovies[currentIndex];
    const swapMovie = pendingMovies[swapIndex];
    
    const currentRank = currentMovie.watch_order_rank || 0;
    const swapRank = swapMovie.watch_order_rank || 0;
    
    // We update optimism visually, then server
    setMovies(prev => prev.map(m => {
      if (m.id === currentMovie.id) return { ...m, watch_order_rank: swapRank };
      if (m.id === swapMovie.id) return { ...m, watch_order_rank: currentRank };
      return m;
    }));

    try {
      await Promise.all([
        fetch(`/api/movies/${currentMovie.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watch_order_rank: swapRank }),
        }),
        fetch(`/api/movies/${swapMovie.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watch_order_rank: currentRank }),
        })
      ]);
    } catch {
      toast.error("Error updating watch order");
      fetchMoviesAndSites(); // Revert
    }
  };

  const filteredMovies = movies.filter(m => {
    if (search && !m.movie_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "added_desc") {
      return b.id - a.id;
    }
    if (sortBy === "rating_desc") return b.rating - a.rating;
    if (sortBy === "name_asc") return a.movie_name.localeCompare(b.movie_name);
    if (sortBy === "watch_order") return (a.watch_order_rank || Infinity) - (b.watch_order_rank || Infinity);
    return 0;
  });

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-6xl mx-auto page-enter">
        {loading ? (
          <>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold">Library</h1>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, i) => <LibraryCardSkeleton key={i} />)}
            </div>
          </>
        ) : error ? (
          <ErrorState
            title="Library failed to load"
            message="We couldn't load your movie library. Please try again."
            onRetry={fetchMoviesAndSites}
          />
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold">Library</h1>
              <Link href="/discover">
                <Button><Plus className="w-4 h-4 mr-2" /> Add Movie</Button>
              </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8 bg-card p-4 rounded-lg border border-border">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  placeholder="Search library..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              
              <select 
                className="h-10 rounded-md border border-input bg-background px-3"
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>

              <select 
                className="h-10 rounded-md border border-input bg-background px-3"
                value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="movie">Movies</option>
                <option value="series">Series</option>
              </select>

              <select 
                className="h-10 rounded-md border border-input bg-background px-3"
                value={sortBy} onChange={e => setSortBy(e.target.value)}
              >
                <option value="added_desc">Recently Added</option>
                <option value="rating_desc">Highest Rated</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="watch_order">Watch Order</option>
              </select>
            </div>

            {filteredMovies.length === 0 ? (
              <EmptyState 
                title="Your library is waiting for its first masterpiece."
                description="Add a movie or series, or adjust your filters to reveal saved titles."
                action={<Link href="/discover"><Button>Add Movie</Button></Link>}
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredMovies.map((movie, index) => (
                  <div key={movie.id} className="ct-stagger-item" style={staggerStyle(index)}>
                    <div
                      className="ct-library-card bg-card rounded-lg overflow-hidden border border-border group relative cursor-pointer"
                      onClick={() => setSelectedItem({ id: movie.tmdb_id, type: movie.type as any })}
                    >
                      <LibraryPoster posterUrl={movie.poster_url} title={movie.movie_name} />
                    
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      {movie.watch_link && (
                        <a href={movie.watch_link} target="_blank" rel="noreferrer" className="mb-4" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="secondary" className="w-full">Watch Link</Button>
                        </a>
                      )}
                      
                      {movie.status === 'pending' && sortBy === 'watch_order' && (
                        <div className="flex gap-2 mb-2">
                          <Button size="sm" variant="secondary" className="flex-1" onClick={(e) => handleMove(e, movie.id, 'up')} title="Move Up">
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="secondary" className="flex-1" onClick={(e) => handleMove(e, movie.id, 'down')} title="Move Down">
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h3 className="ct-card-title font-semibold truncate opacity-95" title={movie.movie_name}>{movie.movie_name}</h3>
                      <div className="ct-card-meta flex gap-2 items-center mt-1.5 mb-1.5 opacity-85">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${movie.type === "series" ? "bg-purple-500/20 text-purple-400" : "bg-primary/20 text-primary"}`}>
                          {movie.type === "series" ? "Series" : "Movie"}
                        </span>
                      </div>
                      <div className="ct-card-meta flex justify-between items-center text-xs text-muted-foreground opacity-85">
                        <span className="capitalize">{movie.status}</span>
                        <span className="flex items-center text-yellow-500">★ {movie.rating}</span>
                      </div>
                    </div>
                  </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <MovieDetailsModal 
        isOpen={!!selectedItem} 
        onClose={() => setSelectedItem(null)} 
        tmdbId={selectedItem?.id || 0} 
        type={selectedItem?.type || "movie"}
        onUpdated={fetchMoviesAndSites}
        onNavigate={(id, type) => setSelectedItem({ id, type: type || "movie" })}
      />
    </AppShell>
  );
}

function LibraryPoster({ posterUrl, title }: { posterUrl?: string | null; title: string }) {
  const [imgPhase, setImgPhase] = useState<"loading" | "revealed" | "loaded">(posterUrl ? "loading" : "loaded");

  const handleImageLoad = () => {
    setImgPhase("revealed");
    setTimeout(() => setImgPhase("loaded"), 80);
  };

  return (
    <div className="relative aspect-[2/3] overflow-hidden bg-secondary">
      <div className={imgPhase === "loading" ? "absolute inset-0 ct-shimmer" : "absolute inset-0 opacity-0 pointer-events-none transition-opacity duration-300"} />
      {posterUrl ? (
        <>
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            className={`ct-poster-img absolute inset-0 w-full h-full object-cover ${imgPhase === "loading" ? "opacity-0" : "opacity-100"} ${imgPhase !== "loaded" ? "ct-poster-img-blurred" : ""}`}
            onLoad={handleImageLoad}
            onError={() => setImgPhase("loaded")}
          />
          <div className={`absolute inset-0 pointer-events-none backdrop-blur-sm bg-black/10 transition-opacity duration-300 ${imgPhase === "loaded" ? "opacity-0" : "opacity-100"}`} />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">No Poster</div>
      )}
    </div>
  );
}
