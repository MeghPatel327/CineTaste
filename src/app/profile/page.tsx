"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProfileCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  User,
  Shield,
  Calendar,
  Film,
  Star,
  Heart,
  Globe,
  KeyRound,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Dna,
  Award,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (res.ok) {
        setProfile(json.data);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.message || "Failed to update password");
      }
    } catch {
      toast.error("Network error while updating password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  // Calculate genre percentage
  const favoriteGenres: { name: string; value: number }[] = profile?.favoriteGenres ?? [];
  const genreTotal = favoriteGenres.reduce((acc, g) => acc + g.value, 0) || 1;

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-6xl mx-auto page-enter space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-extrabold text-[#F5F7F6]">
            Account & Taste DNA
          </h1>
          <p className="text-sm text-[#A1AAA6] mt-1">
            Personal profile and insights derived strictly from your library activity.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
          </div>
        ) : error || !profile ? (
          <ErrorState
            title="Profile unavailable"
            message="Could not load your user profile data."
            onRetry={fetchProfile}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ── Left Column: Profile Card + Taste DNA ── */}
            <div className="space-y-8">
              {/* Profile Card */}
              <div className="glass-panel p-6 rounded-2xl space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl font-heading font-extrabold uppercase shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                    {profile.username.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-[#F5F7F6]">
                      {profile.username}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mt-1 capitalize">
                      <Shield className="w-3 h-3" />
                      {profile.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5 pt-4 border-t border-white/[0.08] text-sm">
                  <div className="flex justify-between items-center text-[#A1AAA6]">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" /> Member Since
                    </span>
                    <span className="font-medium text-[#F5F7F6]">
                      {new Date(profile.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#A1AAA6]">
                    <span className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-emerald-400" /> Movies Completed
                    </span>
                    <span className="font-medium text-[#F5F7F6]">
                      {profile.moviesWatched}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#A1AAA6]">
                    <span className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400" /> Average Rating
                    </span>
                    <span className="font-medium text-[#F5F7F6]">
                      {profile.avgRating} / 10
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#A1AAA6]">
                    <span className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-400" /> Favorite Genre
                    </span>
                    <span className="font-medium text-[#F5F7F6]">
                      {profile.favoriteGenre}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#A1AAA6]">
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" /> Preferred Industry
                    </span>
                    <span className="font-medium text-[#F5F7F6]">
                      {profile.favoriteIndustry}
                    </span>
                  </div>
                </div>
              </div>

              {/* Taste DNA Meter */}
              <div className="glass-panel p-6 rounded-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg font-bold flex items-center gap-2 text-[#F5F7F6]">
                    <Dna className="w-5 h-5 text-emerald-400" />
                    Taste DNA Distribution
                  </h3>
                  <span className="text-xs text-emerald-400/90 font-mono">
                    {favoriteGenres.length} Genres
                  </span>
                </div>

                {favoriteGenres.length === 0 ? (
                  <p className="text-xs text-[#A1AAA6]">
                    No genre data yet. Rate more titles in your library to construct your Taste DNA.
                  </p>
                ) : (
                  <div className="space-y-3 pt-1">
                    {favoriteGenres.slice(0, 5).map((g, idx) => {
                      const pct = Math.round((g.value / genreTotal) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#F5F7F6] font-medium">{g.name}</span>
                            <span className="text-[#A1AAA6] font-mono">{pct}%</span>
                          </div>
                          <div className="h-2 w-full bg-[#0D1013] rounded-full overflow-hidden border border-white/[0.06]">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Column: Preferences, Password & Security ── */}
            <div className="space-y-8">
              {/* Appearance Preferences */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="font-heading text-lg font-bold flex items-center gap-2 text-[#F5F7F6]">
                  <Sun className="w-5 h-5 text-emerald-400" />
                  Appearance & Theme
                </h3>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-[#A1AAA6]">Interface Theme</span>
                  <div className="flex bg-[#0D1013] border border-white/[0.08] rounded-xl p-1 gap-1">
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        theme === "dark"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-[#A1AAA6] hover:text-[#F5F7F6]"
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" /> Dark
                    </button>
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        theme === "light"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-[#A1AAA6] hover:text-[#F5F7F6]"
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" /> Light
                    </button>
                    <button
                      onClick={() => setTheme("system")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        theme === "system"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-[#A1AAA6] hover:text-[#F5F7F6]"
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" /> System
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Change */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="font-heading text-lg font-bold flex items-center gap-2 text-[#F5F7F6]">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                  Security & Password
                </h3>
                <form onSubmit={handlePasswordChange} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[#A1AAA6] uppercase tracking-wider mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#0D1013] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F7F6] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#A1AAA6] uppercase tracking-wider mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#0D1013] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F7F6] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#A1AAA6] uppercase tracking-wider mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#0D1013] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F7F6] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#08090C] font-semibold py-2.5 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all"
                  >
                    {isChangingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </div>

              {/* Account Sign Out */}
              <div className="glass-panel p-6 rounded-2xl border-rose-500/20 bg-rose-500/[0.03] space-y-4">
                <h3 className="font-heading text-lg font-bold flex items-center gap-2 text-rose-400">
                  <LogOut className="w-5 h-5 text-rose-400" />
                  Session & Sign Out
                </h3>
                <p className="text-xs text-[#A1AAA6]">
                  Sign out of your CineTaste session on this browser device.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 py-2.5 rounded-xl font-semibold"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
