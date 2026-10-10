"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { HeroCarousel } from "@/components/HeroCarousel";
import { MediaRow } from "@/components/MediaRow";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";
import { LibraryView } from "@/components/views/LibraryView";
import { QueueView } from "@/components/views/QueueView";
import { AdminView } from "@/components/views/AdminView";
import { ProfileView } from "@/components/views/ProfileView";
import { AboutView } from "@/components/views/AboutView";
import { MediaCard } from "@/components/MediaCard";
import {
  HERO_CAROUSEL_ITEMS,
  CONTINUE_WATCHING_ITEMS,
  BECAUSE_YOU_LOVED_ITEMS,
  HIDDEN_GEMS_ITEMS,
  POPULAR_MOVIES_ITEMS,
  POPULAR_SERIES_ITEMS,
} from "@/data/mockMedia";
import { MediaItem, CarouselSlide } from "@/types/media";
import { Sparkles, SlidersHorizontal, Film, Tv, Flame } from "lucide-react";

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState("home");
  const [selectedMovie, setSelectedMovie] = useState<MediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeGenre, setActiveGenre] = useState("All");

  // User & Personalized Recommendations
  const [currentUser, setCurrentUser] = useState<{ username: string; email: string; role: string } | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<MediaItem[]>([]);
  const [aiEngine, setAiEngine] = useState<string>("gemini_local");

  // Initialize tab from query params if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["home", "library", "queue", "admin", "profile", "about"].includes(tabParam)) {
        setCurrentTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (newTab: string) => {
    setCurrentTab(newTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (newTab === "home") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", newTab);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Load current session and redirect to /login if unauthenticated
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          const dest = window.location.pathname + window.location.search;
          window.location.href = dest && dest !== "/" ? `/login?redirect=${encodeURIComponent(dest)}` : "/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.success && data?.data?.user) {
          setCurrentUser(data.data.user);
        } else if (data !== null) {
          const dest = window.location.pathname + window.location.search;
          window.location.href = dest && dest !== "/" ? `/login?redirect=${encodeURIComponent(dest)}` : "/login";
        }
      })
      .catch(() => {
        const dest = window.location.pathname + window.location.search;
        window.location.href = dest && dest !== "/" ? `/login?redirect=${encodeURIComponent(dest)}` : "/login";
      });
  }, []);

  // Load AI recommendations
  useEffect(() => {
    fetch("/api/recommendations")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setAiRecommendations(data.data);
          if (data.meta?.engine) setAiEngine(data.meta.engine);
        }
      })
      .catch(() => {});
  }, []);

  // Handle Search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/media?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSearchResults(data.data);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectMovie = (movie: MediaItem | CarouselSlide) => {
    setSelectedMovie(movie);
  };

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={handleTabChange}
      onSearch={handleSearch}
      activeGenre={activeGenre}
      onGenreChange={setActiveGenre}
      currentUser={currentUser}
    >
      {/* ── SEARCH RESULTS STAGE ── */}
      {searchQuery.trim() ? (
        <div className="px-6 md:px-12 py-8 space-y-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-white">
              Search Results for &ldquo;{searchQuery}&rdquo;
            </h2>
            <button
              onClick={() => handleSearch("")}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Clear Search
            </button>
          </div>

          {isSearching ? (
            <div className="py-20 text-center text-zinc-400 animate-pulse text-sm">
              Querying CineTaste catalog...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {searchResults.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onClick={handleSelectMovie}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-zinc-400 text-sm glass-panel rounded-2xl">
              No matching titles found in catalog or TMDB.
            </div>
          )}
        </div>
      ) : (
        /* ── TAB VIEWS ── */
        <>
          {currentTab === "home" && (
            <div className="space-y-6">
              {/* 75vh Featured Hero Spotlight with Discover Watch Options */}
              <HeroCarousel
                items={HERO_CAROUSEL_ITEMS}
                onSelectMovie={handleSelectMovie}
              />

              {/* ── GENRE & DISCOVERY FILTERS (Below Hero Section) ── */}
              <div className="px-6 md:px-12 py-2 sticky top-[57px] z-30 bg-[#08090C]/90 backdrop-blur-xl border-y border-white/5">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mr-2 shrink-0 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                    Filter by:
                  </span>
                  {["All", "Sci-Fi", "Action", "Drama", "Mystery", "Adventure", "Thriller", "Crime", "Animation"].map((genre) => {
                    const isActive = activeGenre === genre;
                    return (
                      <button
                        key={genre}
                        onClick={() => setActiveGenre(genre)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                          isActive
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                            : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/5"
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Rails Below Hero & Filters */}
              <div className="relative z-20 mt-4 space-y-6">
                {/* When a specific genre filter is selected, show filtered discovery row */}
                {activeGenre !== "All" && (
                  <MediaRow
                    title={`Explore ${activeGenre}`}
                    subtitle={`Titles in the CineTaste catalog containing the ${activeGenre} genre`}
                    items={[
                      ...HERO_CAROUSEL_ITEMS,
                      ...POPULAR_MOVIES_ITEMS,
                      ...POPULAR_SERIES_ITEMS,
                      ...BECAUSE_YOU_LOVED_ITEMS,
                      ...HIDDEN_GEMS_ITEMS,
                    ].filter((item, idx, self) =>
                      item.genres.some((g) => g.toLowerCase() === activeGenre.toLowerCase()) &&
                      self.findIndex((s) => s.title.toLowerCase() === item.title.toLowerCase()) === idx
                    )}
                    onSelectItem={handleSelectMovie}
                  />
                )}

                {/* AI Taste Profile Personalized Rail */}
                {aiRecommendations.length > 0 && (
                  <MediaRow
                    title="Curated Recommendations"
                    subtitle={`Generated via ${aiEngine.replace("_", " ").toUpperCase()} based on multi-genre affinities and catalog signals`}
                    items={aiRecommendations}
                    onSelectItem={handleSelectMovie}
                  />
                )}

                {/* Popular Movies Section */}
                <MediaRow
                  title="Popular Movies"
                  subtitle="Essential theatrical releases and critically acclaimed masterpieces"
                  items={POPULAR_MOVIES_ITEMS}
                  onSelectItem={handleSelectMovie}
                />

                {/* Popular Series Section */}
                <MediaRow
                  title="Popular Series"
                  subtitle="Top episodic drama, mystery, and high-concept sci-fi television"
                  items={POPULAR_SERIES_ITEMS}
                  onSelectItem={handleSelectMovie}
                />

                {/* Continue Watching Row */}
                <MediaRow
                  title="Continue Watching"
                  subtitle="Pick up where you left off in your private cinema queue"
                  items={CONTINUE_WATCHING_ITEMS}
                  onSelectItem={handleSelectMovie}
                  showProgress={true}
                />

                {/* Trending / Hidden Gems */}
                <MediaRow
                  title="Trending & Hidden Gems"
                  subtitle="High taste affinity indie gems with minimal mainstream clutter"
                  items={HIDDEN_GEMS_ITEMS}
                  onSelectItem={handleSelectMovie}
                />

                {/* Because You Loved Blade Runner 2049 */}
                <MediaRow
                  title="Because You Loved Blade Runner 2049"
                  subtitle="Curated by CineTaste taste algorithm based on directors and dystopian atmospheric tones"
                  items={BECAUSE_YOU_LOVED_ITEMS}
                  onSelectItem={handleSelectMovie}
                />
              </div>
            </div>
          )}

          {currentTab === "library" && (
            <LibraryView onSelectItem={handleSelectMovie} />
          )}

          {currentTab === "queue" && (
            <QueueView onSelectItem={handleSelectMovie} />
          )}

          {currentTab === "admin" && (
            currentUser?.role === "admin" ? (
              <AdminView />
            ) : (
              <div className="py-24 text-center space-y-3 glass-panel mx-6 md:mx-12 my-8 rounded-3xl border border-white/5">
                <p className="text-base font-bold text-white">Curator Access Restricted</p>
                <p className="text-xs text-zinc-400">Administrator role required to access system management.</p>
              </div>
            )
          )}

          {currentTab === "profile" && (
            <ProfileView currentUser={currentUser} />
          )}

          {currentTab === "about" && (
            <AboutView />
          )}
        </>
      )}

      {/* Layered Frosted Glass Movie Details Modal with Verified Watch Options */}
      <MovieDetailsModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
      />
    </AppShell>
  );
}
