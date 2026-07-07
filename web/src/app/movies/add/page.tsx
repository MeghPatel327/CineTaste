"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getTMDBPosterUrl, TMDBResult, TMDBDetail } from "@/features/movies/tmdbService";
import { Search, Plus, Loader2 } from "lucide-react";

export default function AddMoviePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<TMDBDetail | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [status, setStatus] = useState<"completed" | "pending" | "dropped">("pending");
  const [rating, setRating] = useState(0);
  const [watchOrder, setWatchOrder] = useState(0);
  const [watchLink, setWatchLink] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) setResults(data.data);
      else toast.error("Failed to search TMDB");
    } catch (err) {
      toast.error("Error searching TMDB");
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (result: TMDBResult) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/tmdb/details?id=${result.id}&type=${result.media_type}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedMovie({
          ...data.data,
          media_type: result.media_type // keep track of type
        });
      } else {
        toast.error("Failed to fetch details");
      }
    } catch (err) {
      toast.error("Error fetching details");
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovie) return;
    setSaving(true);
    try {
      const payload = {
        movie_name: selectedMovie.title || selectedMovie.name || "",
        type: (selectedMovie as any).media_type === "tv" ? "series" : "movie",
        status,
        rating,
        watch_order_rank: watchOrder,
        watch_link: watchLink || null,
        tmdb_id: selectedMovie.id,
        genres: JSON.stringify(selectedMovie.genres.map(g => g.name)),
        release_year: selectedMovie.release_date ? parseInt(selectedMovie.release_date.split("-")[0]) : (selectedMovie.first_air_date ? parseInt(selectedMovie.first_air_date.split("-")[0]) : 0),
        runtime: selectedMovie.runtime || (selectedMovie.episode_run_time?.[0] || 0),
        language: selectedMovie.original_language,
        poster_url: getTMDBPosterUrl(selectedMovie.poster_path) || "",
        overview: selectedMovie.overview,
      };

      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Added to library");
        router.push("/dashboard");
      } else {
        toast.error(data.message || "Failed to add movie");
      }
    } catch (err) {
      toast.error("Error adding movie");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Add to Library</h1>
      
      {!selectedMovie ? (
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input 
              placeholder="Search movie or series..." 
              value={query} 
              onChange={e => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={searching}>
              {searching ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {results.map((r) => (
              <div key={r.id} className="bg-card rounded-lg overflow-hidden border border-border cursor-pointer hover:border-primary transition" onClick={() => handleSelect(r)}>
                {r.poster_path ? (
                  <img src={getTMDBPosterUrl(r.poster_path) as string} alt="Poster" className="w-full h-64 object-cover" />
                ) : (
                  <div className="w-full h-64 bg-secondary flex items-center justify-center text-muted-foreground">No Image</div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold truncate">{r.title || r.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{r.media_type} • {r.release_date?.split("-")[0] || r.first_air_date?.split("-")[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card p-6 rounded-lg border border-border flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 shrink-0">
            {selectedMovie.poster_path ? (
              <img src={getTMDBPosterUrl(selectedMovie.poster_path, "w500") as string} alt="Poster" className="w-full rounded-lg shadow-lg" />
            ) : (
              <div className="w-full h-96 bg-secondary flex items-center justify-center rounded-lg shadow-lg">No Image</div>
            )}
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{selectedMovie.title || selectedMovie.name}</h2>
            <div className="flex gap-2 mb-4 flex-wrap">
              {selectedMovie.genres.map(g => (
                <span key={g.id} className="px-2 py-1 bg-secondary rounded text-xs">{g.name}</span>
              ))}
            </div>
            <p className="text-muted-foreground mb-6 text-sm">{selectedMovie.overview}</p>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={status} 
                    onChange={e => setStatus(e.target.value as any)}
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Rating (0-10)</label>
                  <Input type="number" min="0" max="10" value={rating} onChange={e => setRating(parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              {status === "pending" && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Watch Order Rank</label>
                  <Input type="number" value={watchOrder} onChange={e => setWatchOrder(parseInt(e.target.value) || 0)} />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">Personal Watch Link (Optional)</label>
                <Input type="url" placeholder="https://..." value={watchLink} onChange={e => setWatchLink(e.target.value)} />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setSelectedMovie(null)} className="flex-1">Back</Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Saving..." : "Save to Library"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
