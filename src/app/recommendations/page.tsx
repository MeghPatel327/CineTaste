"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MovieRow } from "@/features/movies/movieRepository";
import { Button } from "@/components/ui/Button";
import { ChevronUp, ChevronDown, ListTodo, Film, ExternalLink, Calendar } from "lucide-react";
import Link from "next/link";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";
import { cn } from "@/lib/utils";

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
        toast.error("Failed to load watch queue");
      }
    } catch {
      setError(true);
      toast.error("Error loading watch queue");
    } finally {
      setLoading(false);
    }
  };

  // Serialization: only one reorder request in-flight at a time
  const pendingRef = useRef<Promise<void>>(Promise.resolve());

  const handleMoveUp = async (movieId: number, index: number) => {
    if (index === 0 || movingId !== null) return;

    // Optimistic: swap immediately in local state
    const prevQueue = [...queue];
    const newQueue = [...queue];
    [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
    setQueue(newQueue);
    setMovingId(movieId);

    // Serialize writes to prevent race conditions
    pendingRef.current = pendingRef.current.then(async () => {
      try {
        const res = await fetch(`/api/queue/${movieId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction: "up" }),
        });
        if (!res.ok) throw new Error("Server rejected reorder");
      } catch {
        // Revert to previous order on failure
        setQueue(prevQueue);
        toast.error("Failed to save queue order");
      } finally {
        setMovingId(null);
      }
    });
  };

  const handleMoveDown = async (movieId: number, index: number) => {
    if (index === queue.length - 1 || movingId !== null) return;

    // Optimistic: swap immediately in local state
    const prevQueue = [...queue];
    const newQueue = [...queue];
    [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
    setQueue(newQueue);
    setMovingId(movieId);

    // Serialize writes to prevent race conditions
    pendingRef.current = pendingRef.current.then(async () => {
      try {
        const res = await fetch(`/api/queue/${movieId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction: "down" }),
        });
        if (!res.ok) throw new Error("Server rejected reorder");
      } catch {
        // Revert to previous order on failure
        setQueue(prevQueue);
        toast.error("Failed to save queue order");
      } finally {
        setMovingId(null);
      }
    });
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-5xl mx-auto page-enter space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-extrabold flex items-center gap-3 text-[#F5F7F6]">
              <ListTodo className="w-8 h-8 text-emerald-400" />
              Up Next Queue
            </h1>
            <p className="text-sm text-[#A1AAA6] mt-1">
              Your personalized watch queue — reorder to control what plays next.
            </p>
          </div>

          <Link href="/discover">
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-[#08090C] font-semibold rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.3)]">
              + Add Titles to Queue
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="glass-panel p-8 rounded-2xl">
            <LoadingState message="Loading your queue..." />
          </div>
        ) : error ? (
          <ErrorState
            title="Failed to Load Queue"
            message="We couldn't load your watch queue. Please try again."
            onRetry={fetchQueue}
          />
        ) : queue.length === 0 ? (
          <div className="glass-panel p-10 rounded-2xl text-center">
            <EmptyState
              title="Queue is Empty"
              description="You do not have any pending movies queued. Discover titles to build your watchlist!"
              action={
                <Link href="/discover">
                  <Button className="bg-emerald-500 hover:bg-emerald-400 text-[#08090C] font-semibold rounded-xl">
                    Explore Discover
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="glass-panel p-4 sm:p-5 rounded-2xl space-y-3">
            {queue.map((movie, index) => (
              <div
                key={movie.id}
                onClick={() =>
                  setSelectedItem({
                    id: movie.tmdb_id,
                    type: (movie.type as any) || "movie",
                  })
                }
                className={cn(
                  "group relative flex items-center gap-4 p-3.5 sm:p-4 rounded-xl border border-white/[0.06] bg-[#0D1013]/70 hover:bg-[#161B1F] hover:border-emerald-500/40 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg",
                  movingId === movie.id ? "opacity-60 pointer-events-none" : ""
                )}
              >
                {/* Position Badge */}
                <div className="flex-shrink-0 w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-heading font-extrabold text-base">
                  #{index + 1}
                </div>

                {/* Poster */}
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.movie_name}
                    className="w-12 h-16 sm:w-14 sm:h-20 object-cover rounded-xl shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-12 h-16 sm:w-14 sm:h-20 bg-[#121619] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Film className="w-5 h-5 text-[#A1AAA6]" />
                  </div>
                )}

                {/* Movie Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-heading font-bold text-base text-[#F5F7F6] truncate group-hover:text-emerald-300 transition-colors">
                    {movie.movie_name}
                  </h3>
                  <div className="flex items-center gap-2.5 flex-wrap text-xs text-[#A1AAA6]">
                    {movie.type && (
                      <span className="capitalize px-2 py-0.5 rounded-md bg-white/[0.06] text-[#A1AAA6] font-semibold text-[10px]">
                        {movie.type}
                      </span>
                    )}
                    {movie.release_year ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#A1AAA6]" />
                        {movie.release_year}
                      </span>
                    ) : null}
                    {movie.runtime ? <span>{movie.runtime} min</span> : null}
                  </div>
                </div>

                {/* Watch Link */}
                {movie.watch_link && (
                  <a
                    href={movie.watch_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
                  >
                    Watch Stream <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {/* Move Up/Down Controls */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleMoveUp(movie.id, index)}
                    disabled={index === 0 || movingId === movie.id}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-[#A1AAA6] hover:text-emerald-300 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-white/[0.06]"
                    title="Move up in queue"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(movie.id, index)}
                    disabled={index === queue.length - 1 || movingId === movie.id}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-[#A1AAA6] hover:text-emerald-300 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-white/[0.06]"
                    title="Move down in queue"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
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
