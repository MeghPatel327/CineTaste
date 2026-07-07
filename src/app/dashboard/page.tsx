"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/LoadingState";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Film, CheckCircle, Clock, Star, TrendingUp, Sparkles, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (res.ok) setData(json.data);
      else toast.error("Failed to load dashboard");
    } catch {
      toast.error("Error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading || !data) return <LoadingState message="Loading your dashboard..." />;

  const { stats, next5, favoriteGenres, recommendationPreview } = data;

  return (
    <div className="container mx-auto p-4 max-w-6xl py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back to your CineTaste.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/movies/add"><Button variant="outline"><Film className="w-4 h-4 mr-2"/> Add Movie</Button></Link>
          <Link href="/movies"><Button variant="outline">Library</Button></Link>
          <Button variant="ghost" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col items-center text-center">
          <Film className="w-6 h-6 text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Total Titles</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col items-center text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
          <p className="text-sm text-muted-foreground">Watched</p>
          <p className="text-2xl font-bold">{stats.watched}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col items-center text-center">
          <Clock className="w-6 h-6 text-yellow-500 mb-2" />
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold">{stats.pending}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col items-center text-center">
          <Star className="w-6 h-6 text-purple-500 mb-2" />
          <p className="text-sm text-muted-foreground">Avg Rating</p>
          <p className="text-2xl font-bold">{stats.avgRating}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col items-center text-center">
          <TrendingUp className="w-6 h-6 text-blue-400 mb-2" />
          <p className="text-sm text-muted-foreground">Completion</p>
          <p className="text-2xl font-bold">{stats.completionPercentage}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="md:col-span-2 bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock className="text-primary"/> Next 5 to Watch</h2>
          {next5.length === 0 ? (
            <p className="text-muted-foreground">Your watchlist is empty.</p>
          ) : (
            <div className="space-y-4">
              {next5.map((movie: any, idx: number) => (
                <div key={movie.id} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border">
                  <span className="font-bold text-muted-foreground w-6 text-center">{idx + 1}</span>
                  {movie.poster_url ? (
                    <img src={movie.poster_url} className="w-12 h-16 object-cover rounded" alt="poster" />
                  ) : <div className="w-12 h-16 bg-secondary rounded" />}
                  <div className="flex-1">
                    <h3 className="font-semibold">{movie.movie_name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{movie.type} • Rank {movie.watch_order_rank}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col">
          <h2 className="text-xl font-bold mb-4">Favorite Genres</h2>
          {favoriteGenres.length === 0 ? (
            <p className="text-muted-foreground text-center flex-1 flex items-center justify-center">No data yet.</p>
          ) : (
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={favoriteGenres}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {favoriteGenres.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{backgroundColor: '#181b21', borderColor: '#334155'}} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-yellow-500" /> Recommended For You</h2>
          <Link href="/recommendations"><Button variant="outline" size="sm">View All</Button></Link>
        </div>
        {recommendationPreview.length === 0 ? (
          <p className="text-muted-foreground">Add and rate more movies to get personalized recommendations.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendationPreview.map((rec: any) => (
              <div key={rec.movieId} className="flex gap-4 p-4 bg-background rounded-lg border border-border">
                {rec.poster_url ? (
                  <img src={rec.poster_url} className="w-16 h-24 object-cover rounded" alt="poster" />
                ) : <div className="w-16 h-24 bg-secondary rounded" />}
                <div className="flex-1">
                  <h3 className="font-semibold line-clamp-1">{rec.title}</h3>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded mt-1 inline-block">Score: {rec.score}</span>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{rec.reasons[0]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
