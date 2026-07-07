"use client";

import { useEffect, useState } from "react";
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
import { RatingModal } from "@/components/RatingModal";

export default function MovieLibraryPage() {
  const [movies, setMovies] = useState<MovieRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("added_desc");
  
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: "movie" | "series" } | null>(null);
  const [ratingMovieId, setRatingMovieId] = useState<number | null>(null);

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

  const handleStatusUpdate = async (e: React.MouseEvent, id: number, newStatus: string) => {
    e.stopPropagation();
    if (newStatus === "completed") {
      setRatingMovieId(id);
      return;
    }

    try {
      const res = await fetch(`/api/movies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success("Status updated");
        fetchMoviesAndSites();
      }
    } catch {
      toast.error("Error updating status");
    }
  };

  const handleRatingSubmit = async (rating: number) => {
    if (!ratingMovieId) return;
    try {
      const res = await fetch(`/api/movies/${ratingMovieId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", rating }),
      });
      if (res.ok) {
        toast.success("Movie marked as completed");
        fetchMoviesAndSites();
      }
    } catch {
      toast.error("Error saving rating");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/movies/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Movie deleted");
        setMovies(movies.filter(m => m.id !== id));
      }
    } catch {
      toast.error("Error deleting movie");
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
                title="No movies found" 
                description="You haven't added any movies matching these filters yet."
                action={<Link href="/discover"><Button>Add Movie</Button></Link>}
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredMovies.map(movie => (
                  <div key={movie.id} className="bg-card rounded-lg overflow-hidden border border-border group relative cursor-pointer" onClick={() => setSelectedItem({ id: movie.tmdb_id, type: movie.type as any })}>
                    <img src={movie.poster_url || ""} alt={movie.movie_name} className="w-full aspect-[2/3] object-cover" />
                    
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
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
                      
                      <Button size="sm" variant="outline" className="mb-2" onClick={(e) => handleStatusUpdate(e, movie.id, movie.status === 'pending' ? 'completed' : 'pending')}>
                        Mark {movie.status === 'pending' ? 'Completed' : 'Pending'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={(e) => handleDelete(e, movie.id)}>Remove</Button>
                    </div>

                    <div className="p-3">
                      <h3 className="font-semibold truncate" title={movie.movie_name}>{movie.movie_name}</h3>
                      <div className="flex gap-2 items-center mt-1.5 mb-1.5">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${movie.type === "series" ? "bg-purple-500/20 text-purple-400" : "bg-primary/20 text-primary"}`}>
                          {movie.type === "series" ? "Series" : "Movie"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="capitalize">{movie.status}</span>
                        <span className="flex items-center text-yellow-500">★ {movie.rating}</span>
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
        onNavigate={(id, type) => setSelectedItem({ id, type: type || "movie" })}
      />

      <RatingModal 
        isOpen={!!ratingMovieId} 
        onClose={() => setRatingMovieId(null)} 
        onSubmit={handleRatingSubmit} 
      />
    </AppShell>
  );
}
