"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/LoadingState";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ErrorState } from "@/components/ui/ErrorState";
import { AppShell } from "@/components/AppShell";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Film, CheckCircle, Clock, Star, TrendingUp, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
      } else {
        setError(true);
        toast.error("Failed to load dashboard");
      }
    } catch {
      setError(true);
      toast.error("Error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        {loading ? (
          <DashboardSkeleton />
        ) : error || !data ? (
          <ErrorState
            title="Dashboard failed to load"
            message="We couldn't load your dashboard data. This might be a temporary issue with the server."
            onRetry={fetchDashboard}
          />
        ) : (
          <DashboardContent data={data} />
        )}
      </div>
    </AppShell>
  );
}

function DashboardContent({ data }: { data: any }) {
  const { stats, next5, favoriteGenres, recommendationPreview } = data;
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: "movie" | "series" } | null>(null);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back to your CineTaste.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-card p-4 rounded-xl border border-border ct-card-interactive flex flex-col items-center text-center">
          <Film className="w-6 h-6 text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Total Titles</p>
          <p className="text-2xl font-bold"><AnimatedNumber value={stats.total} /></p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border ct-card-interactive flex flex-col items-center text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
          <p className="text-sm text-muted-foreground">Watched</p>
          <p className="text-2xl font-bold"><AnimatedNumber value={stats.watched} /></p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border ct-card-interactive flex flex-col items-center text-center">
          <Clock className="w-6 h-6 text-yellow-500 mb-2" />
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold"><AnimatedNumber value={stats.pending} /></p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border ct-card-interactive flex flex-col items-center text-center">
          <Star className="w-6 h-6 text-accent mb-2" />
          <p className="text-sm text-muted-foreground">Avg Rating</p>
          <p className="text-2xl font-bold"><AnimatedNumber value={Number(stats.avgRating)} decimals={1} /></p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border ct-card-interactive flex flex-col items-center text-center">
          <TrendingUp className="w-6 h-6 text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Completion</p>
          <p className="text-2xl font-bold"><AnimatedNumber value={stats.completionPercentage} suffix="%" /></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="md:col-span-2 bg-card p-6 rounded-xl border border-border ct-shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock className="text-primary"/> Next 5 to Watch</h2>
          {next5.length === 0 ? (
            <p className="text-muted-foreground">Your watchlist is empty.</p>
          ) : (
            <div className="space-y-4">
              {next5.map((movie: any, idx: number) => (
                <div key={movie.id} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border ct-card-interactive cursor-pointer" onClick={() => setSelectedItem({ id: movie.tmdb_id, type: movie.type === "series" ? "series" : "movie" })}>
                  <span className="font-bold text-muted-foreground w-6 text-center">{idx + 1}</span>
                  {movie.poster_url ? (
                    <img src={movie.poster_url} className="w-12 h-16 object-cover rounded" alt="poster" />
                  ) : <div className="w-12 h-16 bg-secondary rounded" />}
                  <div className="flex-1">
                    <h3 className="font-semibold">{movie.movie_name}</h3>
                    <div className="flex gap-2 items-center mt-1">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${movie.type === "series" ? "bg-purple-500/20 text-purple-400" : "bg-primary/20 text-primary"}`}>
                        {movie.type === "series" ? "Series" : "Movie"}
                      </span>
                      <span className="text-sm text-muted-foreground">Rank {movie.watch_order_rank}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card p-6 rounded-xl border border-border ct-shadow-sm flex flex-col">
          <h2 className="text-xl font-bold mb-4">Favorite Genres</h2>
          {favoriteGenres.length === 0 ? (
            <p className="text-muted-foreground text-center flex-1 flex items-center justify-center">No data yet.</p>
          ) : (
            <div className="flex-1">
              <div className="min-h-[200px] mb-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={favoriteGenres}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="value"
                      isAnimationActive
                      animationBegin={0}
                      animationDuration={600}
                      animationEasing="ease-out"
                    >
                      {favoriteGenres.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#ffffff" strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: 'var(--ct-card)', borderColor: 'var(--ct-border)', color: 'var(--ct-card-fg)'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {(() => {
                const total = favoriteGenres.reduce((sum: number, g: any) => sum + g.value, 0);
                // Compute percentages that sum to exactly 100
                const rawPcts = favoriteGenres.map((g: any) => (g.value / total) * 100);
                const floored = rawPcts.map((p: number) => Math.floor(p));
                let remainder = 100 - floored.reduce((a: number, b: number) => a + b, 0);
                const remainders = rawPcts.map((p: number, i: number) => ({ i, r: p - floored[i] })).sort((a: any, b: any) => b.r - a.r);
                remainders.forEach((item: any) => { if (remainder > 0) { floored[item.i]++; remainder--; } });

                return (
                  <div className="space-y-2">
                    {favoriteGenres.map((genre: any, index: number) => (
                      <div key={genre.name} className="flex items-center gap-3 chart-legend-item" style={{ animationDelay: `${index * 80}ms` }}>
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm font-medium flex-1">{genre.name}</span>
                        <span className="text-sm font-bold text-muted-foreground w-10 text-right">
                          <AnimatedNumber value={floored[index]} suffix="%" />
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border border-border ct-shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-yellow-500" /> Recommended For You</h2>
          <Link href="/discover"><Button variant="outline" size="sm">View All</Button></Link>
        </div>
        {recommendationPreview.length === 0 ? (
          <p className="text-muted-foreground">Add and rate more movies to get personalized recommendations.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendationPreview.map((rec: any) => (
              <div key={rec.movieId} className="flex gap-4 p-4 bg-background rounded-lg border border-border ct-card-interactive cursor-pointer" onClick={() => setSelectedItem({ id: rec.movieId, type: rec.media_type === "tv" ? "series" : "movie" })}>
                {rec.poster_url ? (
                  <img src={rec.poster_url} className="w-16 h-24 object-cover rounded" alt="poster" />
                ) : <div className="w-16 h-24 bg-secondary rounded" />}
                <div className="flex-1">
                  <h3 className="font-semibold line-clamp-1">{rec.title}</h3>
                  <div className="flex gap-2 items-center mt-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${rec.media_type === "tv" ? "bg-purple-500/20 text-purple-400" : "bg-primary/20 text-primary"}`}>
                      {rec.media_type === "tv" ? "Series" : "Movie"}
                    </span>
                    <span className="text-xs match-badge text-primary-foreground px-2 py-0.5 rounded-full inline-block">{rec.score}% Match</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{rec.reasons[0]}</p>
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
        onNavigate={(id, type) => setSelectedItem({ id, type: type || "movie" })}
      />
    </>
  );
}
