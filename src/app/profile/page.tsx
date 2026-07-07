"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProfileCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { User, Shield, Calendar, Film, Star, Heart, Globe, KeyRound, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { theme, setTheme } = useTheme();

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
      const json = await res.json();
      
      if (res.ok) {
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(json.message || "Failed to change password");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-4xl mx-auto page-enter">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold">Your Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <ProfileCardSkeleton />
              <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                <Skeleton className="h-5 w-36" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-xl space-y-4">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          </div>
        ) : error || !profile ? (
          <ErrorState title="Error" message="Could not load your profile." onRetry={fetchProfile} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: User Info & Stats */}
            <div className="space-y-8">
              <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center text-2xl font-bold uppercase">
                    {profile.username.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{profile.username}</h2>
                    <p className="text-muted-foreground flex items-center gap-1 text-sm capitalize mt-1">
                      <Shield className="w-4 h-4" /> {profile.role}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4"/> Joined</span>
                    <span className="font-medium">{new Date(profile.joinedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2"><Film className="w-4 h-4"/> Movies Watched</span>
                    <span className="font-medium">{profile.moviesWatched}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2"><Star className="w-4 h-4"/> Average Rating</span>
                    <span className="font-medium">{profile.avgRating} / 10</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2"><Heart className="w-4 h-4"/> Favorite Genre</span>
                    <span className="font-medium">{profile.favoriteGenre}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2"><Globe className="w-4 h-4"/> Top Industry</span>
                    <span className="font-medium">{profile.favoriteIndustry}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Sun className="w-5 h-5"/> Preferences</h3>
                <div className="flex justify-between items-center">
                  <span className="font-medium">App Theme</span>
                  <div className="flex bg-secondary rounded-lg p-1">
                    <button 
                      onClick={() => setTheme("system")}
                      className={`flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === "system" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Monitor className="w-4 h-4"/> System
                    </button>
                    <button 
                      onClick={() => setTheme("light")}
                      className={`flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === "light" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Sun className="w-4 h-4"/> Light
                    </button>
                    <button 
                      onClick={() => setTheme("dark")}
                      className={`flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === "dark" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Moon className="w-4 h-4"/> Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Security & Actions */}
            <div className="space-y-8">
              <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><KeyRound className="w-5 h-5"/> Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Password</label>
                    <input 
                      type="password" 
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">New Password</label>
                    <input 
                      type="password" 
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isChangingPassword}>
                    {isChangingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-destructive flex items-center gap-2"><LogOut className="w-5 h-5"/> Account Actions</h3>
                <p className="text-sm text-muted-foreground mb-4">Sign out of your CineTaste account on this device.</p>
                <Button variant="destructive" onClick={handleLogout} className="w-full">
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
