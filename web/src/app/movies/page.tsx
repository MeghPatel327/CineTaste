"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MovieRow } from "@/features/movies/movieRepository";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import Link from "next/link";
import { Plus, Search, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";

export default function MovieLibraryPage() {
  const [movies, setMovies] = useState<MovieRow[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("added_desc");

  useEffect(() => {
    fetchMoviesAndSites();
  }, []);

  const fetchMoviesAndSites = async () => {
    try {
      const [moviesRes, sitesRes] = await Promise.all([
        fetch("/api/movies"),
        fetch("/api/admin/pirate-sites")
      ]);
      
      if (moviesRes.ok) setMovies((await moviesRes.json()).data);
      if (sitesRes.ok) setSites((await sitesRes.json()).data.filter((s: any) => s.enabled));
    } catch {
      toast.error("Error loading library");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
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

  const handleDelete = async (id: number) => {
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

  const filteredMovies = movies.filter(m => {
    if (search && !m.movie_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "added_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "rating_desc") return b.rating - a.rating;
    if (sortBy === "name_asc") return a.movie_name.localeCompare(b.movie_name);
    if (sortBy === "watch_order") return (a.watch_order_rank || Infinity) - (b.watch_order_rank || Infinity);
    return 0;
  });

  if (loading) return <LoadingState message="Loading your library..." />;

  return (
    <div className="container mx-auto p-4 max-w-6xl py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Library</h1>
        <Link href="/movies/add">
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
          action={<Link href="/movies/add"><Button>Add Movie</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredMovies.map(movie => (
            <div key={movie.id} className="bg-card rounded-lg overflow-hidden border border-border group relative">
              <img src={movie.poster_url || ""} alt={movie.movie_name} className="w-full aspect-[2/3] object-cover" />
              
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                {movie.status === 'pending' && !movie.watch_link && sites.length > 0 && (
                  <div className="mb-4 flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground font-semibold">Search on:</p>
                    {sites.map(site => (
                      <a 
                        key={site.id} 
                        href={site.search_url.replace('{query}', encodeURIComponent(movie.movie_name))}
                        target="_blank" rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {site.name} <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
                
                {movie.watch_link && (
                  <a href={movie.watch_link} target="_blank" rel="noreferrer" className="mb-4">
                    <Button size="sm" variant="secondary" className="w-full">Watch Link</Button>
                  </a>
                )}
                
                <Button size="sm" variant="outline" className="mb-2" onClick={() => handleStatusUpdate(movie.id, movie.status === 'pending' ? 'completed' : 'pending')}>
                  Mark {movie.status === 'pending' ? 'Completed' : 'Pending'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(movie.id)}>Remove</Button>
              </div>

              <div className="p-3">
                <h3 className="font-semibold truncate" title={movie.movie_name}>{movie.movie_name}</h3>
                <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                  <span className="capitalize">{movie.status}</span>
                  <span className="flex items-center text-yellow-500">★ {movie.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
