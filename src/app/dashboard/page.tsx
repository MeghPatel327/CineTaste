"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/ui/ErrorState";
import { AppShell } from "@/components/AppShell";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CheckCircle, Clock, Sparkles, Award, Lightbulb, PlayCircle, Hash } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";
import {
  StatCardSkeleton,
  WatchRowSkeleton,
  GenreRowSkeleton,
  RecPreviewSkeleton,
  Skeleton,
} from "@/components/ui/Skeleton";
import { useCountUp } from "@/hooks/useCountUp";

let dashboardCacheRef: { data: any; fetchedAt: number } | null = null;
const DASHBOARD_TTL = 60_000;

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];
const staggerStyle = (index: number, step = 50) => ({
  "--ct-stagger-delay": `${index * step}ms`,
} as CSSProperties);

export default function DashboardPage() {
  const [data, setData] = useState<any>(dashboardCacheRef?.data ?? null);
  const [loading, setLoading] = useState(!dashboardCacheRef?.data);
  const [error, setError] = useState(false);

  const fetchDashboard = useCallback(async (force = false) => {
    if (!force && dashboardCacheRef && Date.now() - dashboardCacheRef.fetchedAt < DASHBOARD_TTL) {
      setData(dashboardCacheRef.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (res.ok) {
        dashboardCacheRef = { data: json.data, fetchedAt: Date.now() };
        setData(json.data);
      } else { setError(true); toast.error("Failed to load dashboard"); }
    } catch {
      setError(true);
      toast.error("Error loading dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-6xl mx-auto page-enter">
        {error && !loading ? (
          <ErrorState
            title="Dashboard failed to load"
            message="We couldn't load your dashboard data. This might be a temporary issue with the server."
            onRetry={() => fetchDashboard(true)}
          />
        ) : (
          <DashboardContent data={data} loading={loading} />
        )}
      </div>
    </AppShell>
  );
}

function AnimatedStat({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const [display, setDisplay] = useState("0");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (value === 0) {
      setDisplay(decimals > 0 ? (0).toFixed(decimals) : "0");
      return;
    }
    const duration = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * value;
      setDisplay(decimals > 0 ? current.toFixed(decimals) : Math.round(current).toString());
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString());
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, decimals]);

  return <span>{display}{suffix}</span>;
}

function DashboardContent({ data, loading }: { data: any; loading: boolean }) {
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: "movie" | "series" } | null>(null);

  const stats = data?.stats;
  const next5 = data?.next5 ?? [];
  const favoriteGenres = data?.favoriteGenres ?? [];
  const recommendationPreview = data?.recommendationPreview ?? [];
  const insights = data?.insights ?? [];

  const genreTotal = favoriteGenres.reduce((s: number, g: any) => s + g.value, 0);
  const genreFloored = (() => {
    if (!genreTotal) return favoriteGenres.map(() => 0);
    const raw = favoriteGenres.map((g: any) => (g.value / genreTotal) * 100);
    const fl = raw.map((p: number) => Math.floor(p));
    let rem = 100 - fl.reduce((a: number, b: number) => a + b, 0);
    raw.map((p: number, i: number) => ({ i, r: p - fl[i] })).sort((a: any, b: any) => b.r - a.r).forEach((item: any) => { if (rem > 0) { fl[item.i]++; rem--; } });
    return fl;
  })();

  const InsightIcon = ({ index }: { index: number }) => {
    const icons = [Award, Sparkles, CheckCircle, Lightbulb, PlayCircle, Hash];
    const Icon = icons[index % icons.length];
    return <Icon className="w-6 h-6 text-primary mb-2" />;
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back to your CineTaste.</p>
      </div>

      {/* ── 1. Recommended For You (HERO) ── */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-md mb-8 ring-1 ring-primary/20 bg-gradient-to-br from-card to-card/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-accent" />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="text-primary w-6 h-6" /> Recommended For You
          </h2>
          <Link href="/discover">
            <Button variant="default" size="sm" className="shadow-lg shadow-primary/20">View All</Button>
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <RecPreviewSkeleton key={i} />)}
          </div>
        ) : recommendationPreview.length === 0 ? (
          <EmptyState
            title="Recommendations are waiting for your taste."
            description="Add and rate more titles to unlock a sharper CineTaste feed."
            action={<Link href="/discover"><Button size="sm">Discover Titles</Button></Link>}
            compact
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendationPreview.map((rec: any, index: number) => (
              <div
                key={rec.movieId}
                className="ct-stagger-item group flex gap-4 p-4 bg-background/50 rounded-xl border border-border cursor-pointer hover:border-primary/60 hover:bg-background transition-all duration-300 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]"
                style={staggerStyle(index)}
                onClick={() => setSelectedItem({ id: rec.movieId, type: rec.media_type === "tv" ? "series" : "movie" })}
              >
                {rec.poster_url ? (
                  <img src={rec.poster_url} className="w-20 h-28 object-cover rounded-lg shadow-md group-hover:scale-105 transition-transform duration-300" alt="poster" />
                ) : (
                  <div className="w-20 h-28 bg-secondary rounded-lg" />
                )}
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-bold text-lg leading-tight line-clamp-2">{rec.title}</h3>
                  <div className="flex gap-2 items-center mt-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${rec.media_type === "tv" ? "bg-purple-500/20 text-purple-400" : "bg-primary/20 text-primary"}`}>
                      {rec.media_type === "tv" ? "Series" : "Movie"}
                    </span>
                    <span className="text-[10px] font-bold bg-green-500/20 text-green-500 px-2 py-0.5 rounded">{rec.score}% Match</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed opacity-90">{rec.reasons[0]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. Intelligent Statistics ── */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Taste Insights</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading || (!insights.length && !stats) ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : insights.length > 0 ? (
            insights.slice(0, 4).map((insight: any, i: number) => (
              <div key={i} className="ct-stagger-item bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col items-center text-center group hover:border-primary/50 transition-colors" style={staggerStyle(i)}>
                <InsightIcon index={i} />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{insight.title}</p>
                <p className="text-xl font-bold line-clamp-1">{insight.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1 opacity-70">{insight.description}</p>
              </div>
            ))
          ) : (
             <div className="col-span-full">
               <EmptyState title="Not enough data" description="Rate more movies to unlock insights." compact />
             </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* ── 3. Next 5 to Watch (Premium Queue) ── */}
        <div className="md:col-span-2 bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold flex items-center gap-2">
              <PlayCircle className="text-primary w-5 h-5" /> Up Next
             </h2>
             <Link href="/recommendations"><Button variant="ghost" size="sm" className="text-xs">Manage Queue</Button></Link>
          </div>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <WatchRowSkeleton key={i} />)}
            </div>
          ) : next5.length === 0 ? (
            <EmptyState
              title="Your queue is empty."
              description="Add a movie or series to build your watch order."
              action={<Link href="/discover"><Button size="sm">Add Movie</Button></Link>}
              compact
            />
          ) : (
            <div className="space-y-3">
              {next5.map((movie: any, idx: number) => (
                <div
                  key={movie.id}
                  className="ct-stagger-item group relative flex items-center gap-4 p-3 pr-4 bg-background rounded-xl border border-border cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  style={staggerStyle(idx)}
                  onClick={() => setSelectedItem({ id: movie.tmdb_id, type: movie.type === "series" ? "series" : "movie" })}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="font-bold text-muted-foreground/50 text-xl w-6 text-center tabular-nums">{idx + 1}</span>
                  {movie.poster_url ? (
                    <img src={movie.poster_url} className="w-14 h-20 object-cover rounded-md shadow-sm" alt="poster" />
                  ) : (
                    <div className="w-14 h-20 bg-secondary rounded-md" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base truncate">{movie.movie_name}</h3>
                    <div className="flex gap-2 items-center mt-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${movie.type === "series" ? "bg-purple-500/20 text-purple-400" : "bg-primary/20 text-primary"}`}>
                        {movie.type === "series" ? "Series" : "Movie"}
                      </span>
                      {movie.release_year > 0 && (
                         <span className="text-xs text-muted-foreground/80">{movie.release_year}</span>
                      )}
                      {movie.runtime > 0 && (
                         <span className="text-xs text-muted-foreground/80 flex items-center gap-1"><Clock className="w-3 h-3" />{movie.runtime}m</span>
                      )}
                    </div>
                  </div>
                  {movie.watch_link && (
                     <div className="hidden sm:flex px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold items-center gap-1">
                       <PlayCircle className="w-3 h-3" /> Ready
                     </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. Favorite Genres ── */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col">
          <h2 className="text-xl font-bold mb-4">Taste Breakdown</h2>
          {loading ? (
            <div className="flex-1 space-y-3">
              <Skeleton className="w-full h-[200px] rounded-xl" />
              <div className="space-y-2 mt-4">
                {Array.from({ length: 4 }).map((_, i) => <GenreRowSkeleton key={i} />)}
              </div>
            </div>
          ) : favoriteGenres.length === 0 ? (
            <EmptyState
              title="No taste profile yet"
              description="Rate a few titles so CineTaste can learn your favorite genres."
              action={<Link href="/movies"><Button size="sm" variant="outline">Open Library</Button></Link>}
              compact
            />
          ) : (
            <div className="flex-1">
              <div className="min-h-[200px] mb-4 relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={favoriteGenres}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={true}
                    >
                      {favoriteGenres.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--ct-card)",
                        borderColor: "var(--ct-border)",
                        color: "var(--ct-card-fg)",
                        borderRadius: "0.5rem",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      itemStyle={{ color: "var(--ct-card-fg)", fontSize: "0.875rem", fontWeight: 500 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {favoriteGenres.map((genre: any, index: number) => (
                  <div
                    key={genre.name}
                    className="flex items-center gap-3 chart-legend-item bg-background/50 p-2 rounded-lg"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm font-semibold flex-1 truncate">{genre.name}</span>
                    <span className="text-sm font-bold text-muted-foreground w-12 text-right">{genreFloored[index]}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <MovieDetailsModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        tmdbId={selectedItem?.id || 0}
        type={selectedItem?.type || "movie"}
        onNavigate={(id, type) => setSelectedItem({ id, type: type || "movie" })}
      />
    </>
  );
}
