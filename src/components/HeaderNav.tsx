"use client";

import { useState } from "react";
import { Search, Bell, SlidersHorizontal, User, Menu, LogOut, Check } from "lucide-react";

interface HeaderNavProps {
  onSearch?: (query: string) => void;
  activeGenre?: string;
  onGenreChange?: (genre: string) => void;
  onToggleMobileMenu?: () => void;
  currentUser?: { username: string; email: string; role: string } | null;
  onOpenProfile?: () => void;
}

export function HeaderNav({
  onSearch,
  activeGenre = "All",
  onGenreChange,
  onToggleMobileMenu,
  currentUser,
  onOpenProfile,
}: HeaderNavProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const genres = ["All", "Sci-Fi", "Neo-Noir", "Mystery", "Drama", "IMAX"];

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-6 py-3 bg-[#08090C]/80 backdrop-blur-xl border-b border-white/5 transition-all">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl bg-white/[0.04] text-zinc-300 hover:text-white border border-white/5 transition-colors shrink-0"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search bar */}
        <div
          className={`flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all duration-200 flex-1 max-w-md ${
            isFocused
              ? "bg-[#181B26] border border-emerald-500/50 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
              : "bg-white/[0.04] border border-white/5 hover:border-white/15"
          }`}
        >
          <Search className={`w-4 h-4 shrink-0 transition-colors ${isFocused ? "text-emerald-400" : "text-zinc-400"}`} />
          <input
            type="text"
            placeholder="Search directors, actors, titles, genres..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full bg-transparent border-none text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                onSearch?.("");
              }}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Genre Pills */}
        <div className="hidden lg:flex items-center gap-1.5">
          {genres.map((tag) => {
            const isActive = activeGenre === tag;
            return (
              <button
                key={tag}
                onClick={() => onGenreChange?.(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    : "bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-transparent"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Action icons & Profile */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onGenreChange?.("All")}
            className="hidden sm:flex p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/5 transition-all"
            title="Reset filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            className="relative p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/5 transition-all"
            title="Curator Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_6px_#10b981]" />
          </button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* User Profile Puck */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                onOpenProfile?.();
              }}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-white/5 transition-all"
              title="User Profile"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <div className="w-full h-full rounded-[11px] bg-[#0F1117] flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-300" />
                </div>
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-tight">
                  {currentUser?.username || "Guest Cinephile"}
                </span>
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">
                  {currentUser?.role === "admin" ? "Curator Admin" : "Taste Explorer"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
