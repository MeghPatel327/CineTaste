"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { GameDetailsModal } from "@/components/GameDetailsModal";
import {
  Gamepad2,
  Trophy,
  Clock,
  Star,
  CheckCircle2,
  PlayCircle,
  Bookmark,
  PauseCircle,
  XCircle,
  BarChart3,
  Layers,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useScreenContext } from "@/lib/screenContext";
import type { GameDashboardStats, GameItem } from "@/features/games/gameTypes";

export default function GameDashboardPage() {
  const { setScreenDetails } = useScreenContext();
  const [stats, setStats] = useState<GameDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);

  useEffect(() => {
    setScreenDetails({
      category: "games",
    });
  }, [setScreenDetails]);

  const fetchStats = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/games/dashboard");
      if (!res.ok) throw new Error("Failed to fetch game dashboard stats");
      const json = await res.json();
      const data: GameDashboardStats = json.data || json;
      setStats({
        ...data,
        totalGames: data.totalGames ?? data.total ?? 0,
        backlog: data.backlog ?? data.pending ?? 0,
        totalPlaytimeHours: data.totalPlaytimeHours ?? 0,
        topPlatforms: (data.topPlatforms || []).map((p: any) => ({
          name: p.name ?? p.platform ?? "",
          value: p.value ?? p.count ?? 0,
          platform: p.platform ?? p.name ?? "",
          count: p.count ?? p.value ?? 0,
        })),
        topGenres: (data.topGenres || []).map((g: any) => ({
          name: g.name ?? g.genre ?? "",
          value: g.value ?? g.count ?? 0,
          genre: g.genre ?? g.name ?? "",
          count: g.count ?? g.value ?? 0,
        })),
        nextUpBacklog: data.nextUpBacklog ?? data.nextUp ?? [],
        recentlyUpdated: data.recentlyUpdated ?? data.recentActivity ?? [],
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <AppShell>
      <div className="min-h-screen bg-[#080511] text-[#F5F7F6] pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 border border-purple-500/40 text-purple-300 mb-2">
                <Trophy className="w-3.5 h-3.5 text-purple-400" />
                <span>Personal Gaming Analytics</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <span>Gaming Dashboard</span>
              </h1>
              <p className="text-xs md:text-sm text-purple-300/70 mt-1">
                Track completion stats, platform distributions, hours invested, and your backlog.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/games">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-500/30 text-purple-300 hover:bg-purple-950/40 gap-1.5"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Discover Games</span>
                </Button>
              </Link>
              <Link href="/games/library">
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 gap-1.5"
                >
                  <span>My Game Library</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-purple-950/20 border border-purple-500/15" />
              ))}
            </div>
          ) : error || !stats ? (
            <div className="p-12 text-center text-purple-300 bg-[#130E24]/60 rounded-2xl border border-purple-500/20">
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-purple-400/50" />
              <p className="text-sm">Unable to load gaming metrics right now.</p>
              <Button onClick={() => fetchStats()} size="sm" className="mt-4 bg-purple-600 text-white">
                Retry
              </Button>
            </div>
          ) : (
            <>
              {/* Primary KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Total */}
                <div className="p-4 rounded-2xl bg-[#130E24] border border-purple-500/20 shadow-lg flex flex-col justify-between">
                  <span className="text-xs font-semibold text-purple-300/70 flex items-center justify-between">
                    <span>Total Games</span>
                    <Gamepad2 className="w-4 h-4 text-purple-400" />
                  </span>
                  <div className="mt-3">
                    <span className="text-2xl sm:text-3xl font-black text-white">{stats.totalGames}</span>
                  </div>
                </div>

                {/* Playing */}
                <div className="p-4 rounded-2xl bg-[#130E24] border border-purple-500/30 shadow-lg flex flex-col justify-between">
                  <span className="text-xs font-semibold text-purple-300/70 flex items-center justify-between">
                    <span>Playing Now</span>
                    <PlayCircle className="w-4 h-4 text-purple-400" />
                  </span>
                  <div className="mt-3">
                    <span className="text-2xl sm:text-3xl font-black text-purple-300">{stats.playing}</span>
                  </div>
                </div>

                {/* Completed */}
                <div className="p-4 rounded-2xl bg-[#130E24] border border-purple-500/20 shadow-lg flex flex-col justify-between">
                  <span className="text-xs font-semibold text-purple-300/70 flex items-center justify-between">
                    <span>Completed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </span>
                  <div className="mt-3">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-300">{stats.completed}</span>
                  </div>
                </div>

                {/* Backlog */}
                <div className="p-4 rounded-2xl bg-[#130E24] border border-purple-500/20 shadow-lg flex flex-col justify-between">
                  <span className="text-xs font-semibold text-purple-300/70 flex items-center justify-between">
                    <span>Backlog</span>
                    <Bookmark className="w-4 h-4 text-amber-400" />
                  </span>
                  <div className="mt-3">
                    <span className="text-2xl sm:text-3xl font-black text-amber-300">{stats.backlog}</span>
                  </div>
                </div>

                {/* Avg Rating */}
                <div className="p-4 rounded-2xl bg-[#130E24] border border-purple-500/20 shadow-lg flex flex-col justify-between">
                  <span className="text-xs font-semibold text-purple-300/70 flex items-center justify-between">
                    <span>Avg Rating</span>
                    <Star className="w-4 h-4 text-amber-400" />
                  </span>
                  <div className="mt-3">
                    <span className="text-2xl sm:text-3xl font-black text-white">
                      {stats.avgRating > 0 ? `${stats.avgRating}/10` : "—"}
                    </span>
                  </div>
                </div>

                {/* Completion Rate / Hours */}
                <div className="p-4 rounded-2xl bg-[#130E24] border border-purple-500/20 shadow-lg flex flex-col justify-between">
                  <span className="text-xs font-semibold text-purple-300/70 flex items-center justify-between">
                    <span>Completion</span>
                    <Trophy className="w-4 h-4 text-purple-400" />
                  </span>
                  <div className="mt-3">
                    <span className="text-2xl sm:text-3xl font-black text-purple-300">
                      {stats.completionRate}%
                    </span>
                    {stats.totalPlaytimeHours > 0 && (
                      <span className="text-[10px] text-purple-300/60 block mt-0.5">
                        {stats.totalPlaytimeHours} hrs logged
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Breakdown & Platform Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Platform Distribution */}
                <div className="p-5 rounded-2xl bg-[#130E24] border border-purple-500/20 space-y-4 shadow-xl">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Top Platforms Tracked</span>
                  </h3>

                  {stats.topPlatforms.length === 0 ? (
                    <p className="text-xs text-purple-300/50 py-4">No platform data recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.topPlatforms.map((plat) => {
                        const pct = stats.totalGames > 0 ? Math.round((plat.count / stats.totalGames) * 100) : 0;
                        return (
                          <div key={plat.platform} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-white">{plat.platform}</span>
                              <span className="text-purple-300/70">
                                {plat.count} title{plat.count > 1 ? "s" : ""} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-purple-950/60 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Genre Distribution */}
                <div className="p-5 rounded-2xl bg-[#130E24] border border-purple-500/20 space-y-4 shadow-xl">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    <span>Top Genres in Your Library</span>
                  </h3>

                  {stats.topGenres.length === 0 ? (
                    <p className="text-xs text-purple-300/50 py-4">No genre data recorded yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {stats.topGenres.map((g) => (
                        <div
                          key={g.genre}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/50 border border-purple-500/30 text-xs text-purple-200"
                        >
                          <span className="font-semibold">{g.genre}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-purple-600/40 text-[10px] font-bold text-white">
                            {g.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Next Up in Backlog Section */}
              {stats.nextUpBacklog.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bookmark className="w-5 h-5 text-amber-400" />
                        <span>Next Up in Your Backlog</span>
                      </h2>
                      <p className="text-xs text-purple-300/70">
                        Games planned to play next, waiting in your queue.
                      </p>
                    </div>
                    <Link
                      href="/games/library?status=pending"
                      className="text-xs text-purple-400 hover:text-purple-200 font-semibold"
                    >
                      View all backlog →
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {stats.nextUpBacklog.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        onClick={(g) => setSelectedGame(g)}
                        userStatus={game.status}
                        userRating={game.rating}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recently Updated Games */}
              {stats.recentlyUpdated.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-400" />
                        <span>Recently Tracked & Logged</span>
                      </h2>
                      <p className="text-xs text-purple-300/70">Your most recently updated gaming records.</p>
                    </div>
                    <Link
                      href="/games/library"
                      className="text-xs text-purple-400 hover:text-purple-200 font-semibold"
                    >
                      Full library →
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {stats.recentlyUpdated.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        onClick={(g) => setSelectedGame(g)}
                        userStatus={game.status}
                        userRating={game.rating}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {selectedGame && (
          <GameDetailsModal
            isOpen={Boolean(selectedGame)}
            onClose={() => setSelectedGame(null)}
            gameId={selectedGame.id}
            initialGame={selectedGame}
            onUpdated={() => fetchStats()}
          />
        )}
      </div>
    </AppShell>
  );
}
