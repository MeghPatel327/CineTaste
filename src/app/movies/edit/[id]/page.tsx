"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AppShell } from "@/components/AppShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function EditMoviePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [movie, setMovie] = useState<any>(null);

  // Form State
  const [status, setStatus] = useState<"completed" | "pending" | "dropped">("pending");
  const [rating, setRating] = useState(0);
  const [watchOrder, setWatchOrder] = useState(0);
  const [watchLink, setWatchLink] = useState("");

  useEffect(() => {
    if (id) {
      fetchMovie();
    }
  }, [id]);

  const fetchMovie = async () => {
    setLoading(true);
    setError(false);
    try {
      // Just fetch all movies and find this one.
      const res = await fetch("/api/movies");
      const data = await res.json();
      if (res.ok) {
        const found = data.data.find((m: any) => m.id === parseInt(id, 10));
        if (found) {
          setMovie(found);
          setStatus(found.status);
          setRating(found.rating || 0);
          setWatchOrder(found.watch_order_rank || 0);
          setWatchLink(found.watch_link || "");
        } else {
          setError(true);
        }
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movie) return;
    setSaving(true);
    try {
      const payload = {
        status,
        rating,
        watch_order_rank: watchOrder,
        watch_link: watchLink || null,
      };

      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Movie updated");
        router.back();
      } else {
        toast.error(data.message || "Failed to update movie");
      }
    } catch (err) {
      toast.error("Error updating movie");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Edit Movie</h1>
        
        {loading ? (
          <LoadingState message="Loading..." />
        ) : error || !movie ? (
          <ErrorState title="Not Found" message="Could not load the movie details." onRetry={fetchMovie} />
        ) : (
          <div className="bg-card p-6 rounded-lg border border-border flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 shrink-0">
              {movie.poster_url ? (
                <img src={movie.poster_url} alt="Poster" className="w-full rounded-lg shadow-lg" />
              ) : (
                <div className="w-full h-96 bg-secondary flex items-center justify-center rounded-lg shadow-lg">No Image</div>
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{movie.movie_name}</h2>
              <div className="flex gap-2 mb-4 flex-wrap">
                {movie.genres && (
                  <span className="text-muted-foreground italic text-sm">{
                    Array.isArray(movie.genres) 
                      ? movie.genres.join(", ") 
                      : (movie.genres.startsWith("[") ? JSON.parse(movie.genres).join(", ") : movie.genres)
                  }</span>
                )}
              </div>
              <p className="text-muted-foreground mb-6 text-sm line-clamp-3">{movie.overview}</p>

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
                  <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? "Saving..." : "Update Movie"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
