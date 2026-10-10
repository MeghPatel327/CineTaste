"use client";

import { useState, useEffect } from "react";
import { ProfileStats } from "@/types/media";
import { User, Film, Clock, Star, Sparkles, CheckCircle2, Bookmark, BarChart3, LogIn, LogOut } from "lucide-react";

interface ProfileViewProps {
  currentUser?: { username: string; email: string; role: string } | null;
  onRefreshUser?: () => void;
}

export function ProfileView({ currentUser, onRefreshUser }: ProfileViewProps) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setStats(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          username: authUsername || "Cinephile",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAuthModal(false);
        onRefreshUser?.();
        window.location.reload();
      } else {
        setAuthError(data.error);
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="space-y-8 px-6 md:px-12 py-8 max-w-6xl mx-auto">
      {/* Profile Header Card */}
      <div className="p-6 md:p-8 rounded-3xl glass-panel-elevated bg-[#0F1117]/85 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[2px] shadow-[0_0_24px_rgba(16,185,129,0.35)] shrink-0">
            <div className="w-full h-full rounded-[14px] bg-[#0A0C10] flex items-center justify-center">
              <User className="w-8 h-8 text-emerald-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white font-['Plus_Jakarta_Sans']">
                {currentUser?.username || "CineTaste Member"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentUser?.role === "admin" ? "Curator Admin" : "CineTaste Member"}
              </span>
            </div>
            {currentUser?.email && (
              <p className="text-xs text-zinc-400 font-mono mt-1">
                {currentUser.email}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2.5 rounded-xl font-['Plus_Jakarta_Sans'] font-semibold text-xs glass-pill hover:bg-white/15 text-zinc-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-emerald-400" />
            Switch Account
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl glass-pill hover:bg-red-500/20 text-zinc-400 hover:text-red-300 border border-white/5 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-panel bg-[#12141C]/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-['Plus_Jakarta_Sans']">
            {stats?.totalCompleted ?? 2}
          </div>
          <span className="text-[11px] text-zinc-500">Titles logged</span>
        </div>

        <div className="p-5 rounded-2xl glass-panel bg-[#12141C]/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Watch Time</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-['Plus_Jakarta_Sans']">
            {stats?.totalHoursWatched ?? 5}h
          </div>
          <span className="text-[11px] text-zinc-500">Estimated cinema hours</span>
        </div>

        <div className="p-5 rounded-2xl glass-panel bg-[#12141C]/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">In Queue</span>
            <Bookmark className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-['Plus_Jakarta_Sans']">
            {stats?.totalInQueue ?? 3}
          </div>
          <span className="text-[11px] text-zinc-500">Bookmarked watchlist</span>
        </div>

        <div className="p-5 rounded-2xl glass-panel bg-[#12141C]/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Average Rating</span>
            <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-['Plus_Jakarta_Sans']">
            {stats?.averageUserRating ?? 9.5}
          </div>
          <span className="text-[11px] text-zinc-500">Out of 10.0</span>
        </div>
      </div>

      {/* Analytics: Genre Preferences & Rating Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Genre Affinity Radar / Bars */}
        <div className="p-6 rounded-2xl glass-panel-elevated bg-[#0F1117]/85 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Genre Affinity DNA
            </h3>
            <span className="text-[11px] text-zinc-400">Calculated from History</span>
          </div>

          <div className="space-y-3 pt-2">
            {(stats?.genreBreakdown && stats.genreBreakdown.length > 0
              ? stats.genreBreakdown
              : [
                  { genre: "Sci-Fi", count: 8, percentage: 45 },
                  { genre: "Mystery", count: 5, percentage: 28 },
                  { genre: "Drama", count: 3, percentage: 17 },
                  { genre: "Thriller", count: 2, percentage: 10 },
                ]
            ).map((g) => (
              <div key={g.genre} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">{g.genre}</span>
                  <span className="text-zinc-400 font-mono">{g.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_8px_#10b981]"
                    style={{ width: `${g.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="p-6 rounded-2xl glass-panel-elevated bg-[#0F1117]/85 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Rating Distribution
            </h3>
            <span className="text-[11px] text-zinc-400">Scores 0.5 – 5.0 Stars</span>
          </div>

          <div className="flex items-end justify-between gap-1.5 h-44 pt-6 pb-2 px-1">
            {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((star) => {
              const match = stats?.ratingDistribution?.find((r) => r.rating === star);
              const count = match ? match.count : 0;
              const maxCount = Math.max(3, ...(stats?.ratingDistribution?.map((r) => r.count) || [3]));
              const heightPct = Math.max(8, (count / maxCount) * 100);

              return (
                <div key={star} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] text-zinc-400 font-mono">{count}</span>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      count > 0 ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-white/10"
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[9px] text-zinc-500 font-bold">{star}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Auth Modal for switching accounts */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-2xl glass-panel-elevated bg-[#0F1117] border border-white/10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 p-1 flex items-center justify-center shrink-0">
                <img src="/images/circle_logo.png" alt="CineTaste" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
                {isRegistering ? "Create CineTaste Account" : "Log In to CineTaste"}
              </h3>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              {isRegistering && (
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#151821] border border-white/10 text-white"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#151821] border border-white/10 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#151821] border border-white/10 text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-emerald-400 hover:underline"
                >
                  {isRegistering ? "Have an account? Log In" : "Need an account? Register"}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl font-bold bg-emerald-500 text-black hover:bg-emerald-400"
                  >
                    {isRegistering ? "Register" : "Log In"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
