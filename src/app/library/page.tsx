"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import { Plus, Search } from "lucide-react";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";
import { useAppStore } from "@/lib/appStore";

// Persist filter/scroll state across navigations
const SESSION_KEY = "ct-library-state";

interface LibrarySessionState {
  search: string;
  statusFilter: string;
  typeFilter: string;
  sortBy: string;
  scrollY: number;
}

function saveSession(s: LibrarySessionState) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}

function loadSession(): Partial<LibrarySessionState> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

const staggerStyle = (index: number, step = 50) => ({
  "--ct-stagger-delay": `${index * step}ms`,
} as CSSProperties);

export default function MovieLibraryPage() {
  const { state, getLibrary, dispatch } = useAppStore();

  const saved = loadSession();
  const [movies, setMovies] = useState<MovieRow[]>([]);
  const [loading, setLoading] = useState(!state.library);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState(saved.search ?? "");
  const [statusFilter, setStatusFilter] = useState(saved.statusFilter ?? "all");
  const [typeFilter, setTypeFilter] = useState(saved.typeFilter ?? "all");
  const [sortBy, setSortBy] = useState(saved.sortBy ?? "added_desc");
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: "movie" | "series" } | null>(null);
  const scrollRestored = useRef(false);

  // Load from cache immediately, then refresh in background
  useEffect(() => {
    if (state.library) {
      setMovies(state.library.data);
      setLoading(false);
    }
    getLibrary(false)
      .then(data => { setMovies(data); setLoading(false); })
      .catch(() => setError(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore scroll after render
  useEffect(() => {
    if (!loading && movies.length > 0 && !scrollRestored.current) {
      scrollRestored.current = true;
      const y = saved.scrollY ?? 0;
      if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [loading, movies.length]);

  // Persist state on every change
  useEffect(() => {
    const onUnload = () => saveSession({ search, statusFilter, typeFilter, sortBy, scrollY: window.scrollY });
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [search, statusFilter, typeFilter, sortBy]);

  const handleSaveScroll = useCallback(() => {
    saveSession({ search, statusFilter, typeFilter, sortBy, scrollY: window.scrollY });
  }, [search, statusFilter, typeFilter, sortBy]);

  const refresh = useCallback(async () => {
    setError(false);
    try {
      const data = await getLibrary(true);
      setMovies(data);
    } catch { setError(true); }
  }, [getLibrary]);

  const handleStatusUpdate = async (e: React.MouseEvent, id: number, newStatus: string) => {
    e.stopPropagation();
    // Optimistic update
    dispatch({ type: "UPDATE_LIBRARY_ITEM", payload: { id, updates: { status: newStatus } } });
    setMovies(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as any } : m));
    try {
      const res = await fetch(`/api/movies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) toast.success("Status updated");
      else { toast.error("Error updating status"); refresh(); }
    } catch { toast.error("Error updating status"); refresh(); }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Are you sure?")) return;
    // Optimistic remove
    dispatch({ type: "REMOVE_LIBRARY_ITEM", payload: id });
    setMovies(prev => prev.filter(m => m.id !== id));
    try {
      const res = await fetch(`/api/movies/${id}`, { method: "DELETE" });
      if (res.ok) toast.success("Movie deleted");
      else { toast.error("Error deleting movie"); refresh(); }
    } catch { toast.error("Error deleting movie"); refresh(); }
  };

  const handleMove = async (e: React.MouseEvent, id: number, direction: "up" | "down") => {
    e.stopPropagation();
    const pendingMovies = [...movies]
      .filter(m => m.status === "pending")
      .sort((a, b) => (a.watch_order_rank || 0) - (b.watch_order_rank || 0));
    const currentIndex = pendingMovies.findIndex(m => m.id === id);
    if (currentIndex === -1) return;
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= pendingMovies.length) return;
    const curr = pendingMovies[currentIndex];
    const swap = pendingMovies[swapIndex];
    const currRank = curr.watch_order_rank || 0;
    const swapRank = swap.watch_order_rank || 0;
    // Optimistic
    setMovies(prev => prev.map(m => {
      if (m.id === curr.id) return { ...m, watch_order_rank: swapRank };
      if (m.id === swap.id) return { ...m, watch_order_rank: currRank };
      return m;
    }));
    try {
      await Promise.all([
        fetch(`/api/movies/${curr.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ watch_order_rank: swapRank }) }),
        fetch(`/api/movies/${swap.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ watch_order_rank: currRank }) }),
      ]);
    } catch { toast.error("Error updating watch order"); refresh(); }
  };

  // Targeted 2-row update after a rank swap from the modal — no full reload
  const handleRankChanged = useCallback((
    movedId: number, movedNewRank: number | null,
    swappedId: number, swappedNewRank: number | null
  ) => {
    const patch = (prev: MovieRow[]) => prev.map(m => {
      if (m.id === movedId)   return { ...m, watch_order_rank: movedNewRank };
      if (m.id === swappedId) return { ...m, watch_order_rank: swappedNewRank };
      return m;
    });
    setMovies(patch);
    dispatch({ type: "UPDATE_LIBRARY_ITEM", payload: { id: movedId,   updates: { watch_order_rank: movedNewRank   } } });
    dispatch({ type: "UPDATE_LIBRARY_ITEM", payload: { id: swappedId, updates: { watch_order_rank: swappedNewRank } } });
  }, [dispatch]);

  const filteredMovies = movies.filter(m => {
    if (search && !m.movie_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "added_desc") return b.id - a.id;
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
          <ErrorState title="Library failed to load" message="We couldn't load your movie library. Please try again." onRetry={refresh} />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="font-heading text-3xl md:text-4xl font-extrabold text-[#F5F7F6]">
                  Movie & Series Library
                </h1>
                <p className="text-sm text-[#A1AAA6] mt-1">
                  Manage your personal movie collection, ratings, and watch statuses.
                </p>
              </div>
              <Link href="/discover" onClick={handleSaveScroll}>
                <Button className="bg-emerald-500 hover:bg-emerald-400 text-[#08090C] font-semibold rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.3)]">
                  <Plus className="w-4 h-4 mr-2" /> Add Title
                </Button>
              </Link>
            </div>

            <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-3 mb-8 border-white/[0.08]">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                <input
                  className="w-full bg-[#0D1013] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#F5F7F6] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder:text-[#A1AAA6]/50"
                  placeholder="Search library by title..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="h-10 rounded-xl border border-white/[0.08] bg-[#0D1013] px-3.5 text-sm text-[#F5F7F6] focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending (Queue)</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
              <select
                className="h-10 rounded-xl border border-white/[0.08] bg-[#0D1013] px-3.5 text-sm text-[#F5F7F6] focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all">All Formats</option>
                <option value="movie">Movies</option>
                <option value="series">Series</option>
              </select>
              <select
                className="h-10 rounded-xl border border-white/[0.08] bg-[#0D1013] px-3.5 text-sm text-[#F5F7F6] focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="added_desc">Recently Added</option>
                <option value="rating_desc">Highest Rated</option>
                <option value="name_asc">Alphabetical (A-Z)</option>
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-4 -my-4">
                {filteredMovies.map((movie, index) => (
                  <div key={movie.id} className="ct-stagger-item ct-card-lift-wrapper" style={staggerStyle(index)}>
                    <LibraryCard
                      movie={movie}
                      onClick={() => { handleSaveScroll(); setSelectedItem({ id: movie.tmdb_id, type: movie.type as any }); }}
                    />
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
        onUpdated={refresh}
        onRankChanged={handleRankChanged}
        onNavigate={(id, type) => setSelectedItem({ id, type: type || "movie" })}
      />
    </AppShell>
  );
}

function LibraryCard({ movie, onClick }: { movie: MovieRow; onClick: () => void }) {
  const [imgPhase, setImgPhase] = useState<"loading" | "revealed" | "loaded">(movie.poster_url ? "loading" : "loaded");
  const [ambientRgb, setAmbientRgb] = useState("");
  const extractedRef = useRef(false);

  useEffect(() => {
    if (!movie.poster_url || extractedRef.current) return;
    const t = setTimeout(() => {
      extractedRef.current = true;
      const img = new Image();
      img.crossOrigin = "anonymous";
      const sep = movie.poster_url!.includes("?") ? "&" : "?";
      img.src = movie.poster_url! + sep + "_c=1";
      img.onload = () => {
        try {
          const SIZE = 24;
          const canvas = document.createElement("canvas");
          canvas.width = SIZE; canvas.height = SIZE;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
          const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
          type Bucket = { n: number; r: number; g: number; b: number; score: number };
          const buckets = new Map<string, Bucket>();
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 180) continue;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const rn = r / 255, gn = g / 255, bn = b / 255;
            const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
            const l = (max + min) / 2;
            const d = max - min;
            const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (l < 0.07 || l > 0.92 || s < 0.12) continue;
            const key = `${r >> 3}-${g >> 3}-${b >> 3}`;
            const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, score: 0 };
            cur.n++; cur.r += r; cur.g += g; cur.b += b;
            cur.score += 1 + s * 0.6;
            buckets.set(key, cur);
          }
          let best: Bucket | null = null;
          for (const bk of buckets.values()) { if (!best || bk.score > best.score) best = bk; }
          if (!best || best.n === 0) return;
          setAmbientRgb(`${Math.round(best.r / best.n)},${Math.round(best.g / best.n)},${Math.round(best.b / best.n)}`);
        } catch { /* CORS failed — no ambient */ }
      };
    }, 400);
    return () => clearTimeout(t);
  }, [movie.poster_url]);

  const cardStyle = ambientRgb
    ? ({ "--ct-ambient-rgb": ambientRgb } as React.CSSProperties)
    : undefined;

  const statusClass =
    movie.status === "completed"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : movie.status === "pending"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-rose-500/15 text-rose-400 border-rose-500/30";

  return (
    <div
      className="ct-library-card glass-panel rounded-2xl overflow-hidden group relative cursor-pointer"
      data-ambient={ambientRgb ? "true" : undefined}
      style={cardStyle}
      onClick={onClick}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-[#0D1013]">
        <div className={imgPhase === "loading" ? "absolute inset-0 ct-shimmer" : "absolute inset-0 opacity-0 pointer-events-none transition-opacity duration-300"} />
        {movie.poster_url ? (
          <>
            <img
              src={movie.poster_url} alt={movie.movie_name} loading="lazy" decoding="async"
              className={`ct-poster-img absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${imgPhase === "loading" ? "opacity-0" : "opacity-100"}`}
              onLoad={() => { setImgPhase("revealed"); setTimeout(() => setImgPhase("loaded"), 80); }}
              onError={() => setImgPhase("loaded")}
            />
            <div className={`absolute inset-0 pointer-events-none backdrop-blur-sm bg-black/10 transition-opacity duration-300 ${imgPhase === "loaded" ? "opacity-0" : "opacity-100"}`} />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[#A1AAA6]">No Poster</div>
        )}
      </div>
      {/* Info */}
      <div className="p-3.5 space-y-2">
        <h3 className="font-heading font-bold text-sm text-[#F5F7F6] truncate group-hover:text-emerald-300 transition-colors" title={movie.movie_name}>
          {movie.movie_name}
        </h3>
        <div className="flex gap-2 items-center flex-wrap">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${movie.type === "series" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"}`}>
            {movie.type === "series" ? "Series" : "Movie"}
          </span>
          {movie.release_year ? (
            <span className="text-[11px] text-[#A1AAA6]">{movie.release_year}</span>
          ) : null}
        </div>
        <div className="flex justify-between items-center text-xs pt-1 border-t border-white/[0.06]">
          <span className={`capitalize text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusClass}`}>
            {movie.status}
          </span>
          {movie.rating > 0 ? (
            <span className="flex items-center gap-1 text-amber-400 font-semibold text-xs">
              ★ {movie.rating}
            </span>
          ) : (
            <span className="text-[#A1AAA6]/60 text-[11px]">Unrated</span>
          )}
        </div>
      </div>
    </div>
  );
}
