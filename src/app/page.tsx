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
} from "@/data/mockMedia";
import { MediaItem, CarouselSlide } from "@/types/media";
import { Sparkles } from "lucide-react";

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

  // Load current session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.user) {
          setCurrentUser(data.data.user);
        }
      })
      .catch(() => {});
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
      onTabChange={setCurrentTab}
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

              {/* Secondary Rails Below Hero with Positive Margin (Never Underneath Controls) */}
              <div className="relative z-20 mt-4 space-y-6">
                {/* AI Taste Profile Personalized Rail */}
                {aiRecommendations.length > 0 && (
                  <MediaRow
                    title="Curated For Your Taste DNA"
                    subtitle={`Generated via ${aiEngine.replace("_", " ").toUpperCase()} based on your viewing history and director affinities`}
                    items={aiRecommendations}
                    onSelectItem={handleSelectMovie}
                  />
                )}

                {/* Continue Watching Row */}
                <MediaRow
                  title="Continue Watching"
                  subtitle="Pick up where you left off in your private cinema queue"
                  items={CONTINUE_WATCHING_ITEMS}
                  onSelectItem={handleSelectMovie}
                  showProgress={true}
                />

                {/* Because You Loved Blade Runner 2049 */}
                <MediaRow
                  title="Because You Loved Blade Runner 2049"
                  subtitle="Curated by CineTaste taste algorithm based on directors and dystopian atmospheric tones"
                  items={BECAUSE_YOU_LOVED_ITEMS}
                  onSelectItem={handleSelectMovie}
                />

                {/* Hidden Gems & Cult Sci-Fi */}
                <MediaRow
                  title="Hidden Gems & Cult Sci-Fi"
                  subtitle="High taste affinity indie gems with minimal mainstream clutter"
                  items={HIDDEN_GEMS_ITEMS}
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
            <AdminView />
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
