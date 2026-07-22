"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MovieRow } from "@/features/movies/movieRepository";
import { Button } from "@/components/ui/Button";
import { ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";

export default function UpNextPage() {
  const [queue, setQueue] = useState<MovieRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [movingId, setMovingId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: "movie" | "series" } | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();
      if (res.ok) {
        setQueue(data.data || []);
      } else {
        setError(true);
        toast.error("Failed to load queue");
      }
    } catch {
      setError(true);
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  const handleMoveUp = async (movieId: number, index: number) => {
    if (index === 0) return; // Already first
    setMovingId(movieId);
    try {
      const res = await fetch(`/api/queue/${movieId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "up" }),
      });

      if (res.ok) {
        toast.success("Moved up");
        await fetchQueue();
      } else {
        toast.error("Failed to move movie");
      }
    } catch {
      toast.error("Error moving movie");
    } finally {
      setMovingId(null);
    }
  };

  const handleMoveDown = async (movieId: number, index: number) => {
    if (index === queue.length - 1) return; // Already last
    setMovingId(movieId);
    try {
      const res = await fetch(`/api/queue/${movieId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "down" }),
      });

      if (res.ok) {
        toast.success("Moved down");
        await fetchQueue();
      } else {
        toast.error("Failed to move movie");
      }
    } catch {
      toast.error("Error moving movie");
    } finally {
      setMovingId(null);
    }
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Up Next</h1>
          <p className="text-muted-foreground">Your watch queue — manage what to watch next</p>
        </div>

        {loading ? (
          <LoadingState message="Loading your queue..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Queue"
            message="We couldn't load your watch queue. Please try again."
            onRetry={fetchQueue}
          />
        ) : queue.length === 0 ? (
          <EmptyState
            title="Queue is Empty"
            description="You don't have any pending movies. Add one from the Discover page!"
            action={<Link href="/discover" className="inline-block"><Button>Explore Movies</Button></Link>}
          />
        ) : (
          <div className="space-y-2">
            {queue.map((movie, index) => (
              <div
                key={movie.id}
                onClick={() => setSelectedItem({ id: movie.tmdb_id, type: (movie.type as any) || "movie" })}
                className="flex items-center gap-4 bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-[0_8px_24px_rgba(46,111,64,0.4)] hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
              >
                {/* Position Badge */}
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="font-bold text-lg text-primary">{index + 1}</span>
                </div>

                {/* Poster */}
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.movie_name}
                    className="w-12 h-18 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-18 bg-secondary rounded flex-shrink-0" />
                )}

                {/* Movie Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">{movie.movie_name}</h3>
                  <div className="flex gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                    {movie.type && <span className="capitalize">{movie.type}</span>}
                    {movie.release_year && <span>{movie.release_year}</span>}
                  </div>
                </div>

                {/* Watch Link */}
                {movie.watch_link && (
                  <a
                    href={movie.watch_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary hover:underline text-sm font-medium flex-shrink-0"
                  >
                    Watch →
                  </a>
                )}

                {/* Move Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveUp(movie.id, index); }}
                    disabled={index === 0 || movingId === movie.id}
                    className="p-2 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveDown(movie.id, index); }}
                    disabled={index === queue.length - 1 || movingId === movie.id}
                    className="p-2 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <MovieDetailsModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        tmdbId={selectedItem?.id || 0}
        type={selectedItem?.type || "movie"}
        onUpdated={fetchQueue}
        onNavigate={(id, type) => setSelectedItem({ id, type: type || "movie" })}
      />
    </AppShell>
  );
}
