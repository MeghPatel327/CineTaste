"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { GameDetailsModal } from "@/components/GameDetailsModal";
import {
  Search,
  Gamepad2,
  Sparkles,
  Filter,
  SlidersHorizontal,
  X,
  Star,
  RefreshCw,
  Bookmark,
  Calendar,
  Layers,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useScreenContext } from "@/lib/screenContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CURATED_GAMES } from "@/features/games/curatedGames";
import type { GameItem, GameBrowseResult } from "@/features/games/gameTypes";

const GENRES = [
  "Action",
  "Adventure",
  "Role-playing (RPG)",
  "Shooter",
  "Strategy",
  "Platform",
  "Indie",
  "Puzzle",
  "Racing",
  "Simulation",
  "Sports",
  "Fighting",
  "Arcade",
  "Casual",
  "Massively Multiplayer (MMO)",
  "Family",
  "Card",
  "18+ (Adult / Mature)",
];

const PLATFORMS = [
  "All",
  "PC",
  "PlayStation 5",
  "PlayStation 4",
  "Xbox Series X|S",
  "Xbox One",
  "Nintendo Switch",
];

const MODES = [
  "All",
  "Single player",
  "Multiplayer",
  "Co-operative",
];

const ERAS = [
  { value: "all", label: "All Eras" },
  { value: "modern", label: "Modern (2020+)" },
  { value: "2010s", label: "2010s Era" },
  { value: "2000s", label: "2000s Era" },
  { value: "1990s", label: "1990s Era" },
  { value: "classic", label: "Classic (<1990)" },
];

const SORTS = [
  { value: "rating_desc", label: "Highest Rated" },
  { value: "popularity", label: "Most Popular" },
  { value: "release_desc", label: "Newest First" },
  { value: "release_asc", label: "Oldest First" },
  { value: "name_asc", label: "Title (A-Z)" },
];

export default function GamesBrowsePage() {
  const { setScreenDetails } = useScreenContext();
  const [games, setGames] = useState<GameItem[]>([]);
  const [recommendations, setRecommendations] = useState<GameItem[]>([]);
  const [spotlightGame, setSpotlightGame] = useState<GameItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [query, setQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");
  const [selectedEra, setSelectedEra] = useState("all");
  const [selectedSort, setSelectedSort] = useState("rating_desc");
  const [showFilters, setShowFilters] = useState(false);

  // Selected game for modal
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [addingQuickId, setAddingQuickId] = useState<number | null>(null);

  // Sentinel ref for infinite loading
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Update screen context for CineTaste chat
  useEffect(() => {
    setScreenDetails({
      category: "games",
      searchQuery: query || undefined,
      appliedFilters: {
        genres: selectedGenres.length > 0 ? selectedGenres : undefined,
        era: selectedEra !== "all" ? selectedEra : undefined,
        sort: selectedSort,
      },
    });
  }, [setScreenDetails, query, selectedGenres, selectedEra, selectedSort]);

  // Fetch personalized recommendations
  const fetchRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    try {
      const res = await fetch("/api/games/recommendations?limit=10");
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json || [];
        setRecommendations(data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  // Fetch games catalog with pagination
  const fetchGames = useCallback(
    async (pageNum = 1, isAppend = false) => {
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(false);
      }

      try {
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        params.set("limit", "40");

        if (query.trim()) params.set("q", query.trim());
        if (selectedGenres.length > 0) params.set("genres", selectedGenres.join(","));
        if (selectedPlatform !== "All") params.set("platform", selectedPlatform);
        if (selectedMode !== "All") params.set("game_mode", selectedMode);
        if (selectedEra !== "all") params.set("era", selectedEra);
        if (selectedSort) params.set("sort", selectedSort);

        const res = await fetch(`/api/games/browse?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch games");
        const json = await res.json();
        const data: GameBrowseResult = json.data || json;
        const newItems: GameItem[] = data.games || data.items || [];

        if (isAppend) {
          setGames((prev) => {
            const existingIds = new Set(prev.map((g) => g.id));
            const fresh = newItems.filter((g) => !existingIds.has(g.id));
            return [...prev, ...fresh];
          });
        } else {
          setGames(newItems);
          if (data.featuredSpotlight) {
            setSpotlightGame(data.featuredSpotlight);
          } else if (newItems.length > 0 && !query.trim() && selectedGenres.length === 0) {
            setSpotlightGame(newItems[0]);
          }
        }

        setPage(pageNum);
        setHasMore(data.hasMore ?? newItems.length >= 20);
      } catch {
        if (!isAppend) setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, selectedGenres, selectedPlatform, selectedMode, selectedEra, selectedSort]
  );

  // Debounced search & filter reset
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGames(1, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchGames]);

  // Initial recommendations fetch
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchGames(page + 1, true);
        }
      },
      { rootMargin: "600px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchGames]);

  // Toggle multi-select genre
  const handleToggleGenre = (g: string) => {
    if (g === "All") {
      setSelectedGenres([]);
      return;
    }
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((item) => item !== g) : [...prev, g]
    );
  };

  // Quick Add to Backlog handler from Hero
  const handleQuickAdd = async (game: GameItem) => {
    if (!game) return;
    setAddingQuickId(game.id);
    try {
      const res = await fetch("/api/games/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawg_id: game.id,
          title: game.title,
          status: "pending",
          genres: game.genres || [],
          platforms: game.platforms || [],
          release_year: game.release_year,
          cover_url: game.cover_url,
          backdrop_url: game.backdrop_url,
          summary: game.summary,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to add game");
      }

      toast.success(`"${game.title}" added to your Backlog!`);
      // Update local state
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, inLibrary: true, libraryStatus: "pending" } : g))
      );
      if (spotlightGame && spotlightGame.id === game.id) {
        setSpotlightGame({ ...spotlightGame, inLibrary: true, libraryStatus: "pending" });
      }
      fetchRecommendations();
    } catch (err: any) {
      toast.error(err.message || "Could not add game");
    } finally {
      setAddingQuickId(null);
    }
  };

  // Active filter count
  const activeFiltersCount =
    (selectedGenres.length > 0 ? 1 : 0) +
    (selectedPlatform !== "All" ? 1 : 0) +
    (selectedMode !== "All" ? 1 : 0) +
    (selectedEra !== "all" ? 1 : 0) +
    (selectedSort !== "rating_desc" ? 1 : 0);

  const spotlightRating = spotlightGame?.rating
    ? spotlightGame.rating > 10
      ? (spotlightGame.rating / 10).toFixed(1)
      : Number.isInteger(spotlightGame.rating)
      ? spotlightGame.rating.toString()
      : spotlightGame.rating.toFixed(1)
    : null;

  return (
    <AppShell>
      <div className="min-h-screen bg-[#080511] text-[#F5F7F6] pb-24">
        {/* Spotlight Hero Section */}
        {spotlightGame && !query && selectedGenres.length === 0 && selectedPlatform === "All" && (
          <div className="relative w-full overflow-hidden border-b border-purple-500/20 bg-gradient-to-b from-[#180F33] via-[#0F0A20] to-[#080511]">
            {/* Cinematic Background Backdrop Image */}
            {(spotlightGame.backdrop_url || spotlightGame.cover_url) && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 md:opacity-40 transition-transform duration-1000 scale-105 pointer-events-none"
                style={{ backgroundImage: `url(${spotlightGame.backdrop_url || spotlightGame.cover_url})` }}
              />
            )}
            {/* Gradient Overlays for Maximum Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080511] via-[#080511]/75 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080511] via-[#080511]/90 md:via-[#080511]/70 to-transparent pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Left Content Column */}
                <div className="md:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 border border-purple-500/40 text-purple-300 backdrop-blur-md">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Featured Gaming Spotlight</span>
                    </div>

                    {spotlightGame.isAdult && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500/25 border border-rose-500/50 text-rose-300">
                        18+ Mature
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-lg leading-tight">
                    {spotlightGame.title}
                  </h1>

                  {/* Badges / Meta row */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs md:text-sm">
                    {spotlightRating !== null && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-purple-500/30 text-amber-300 font-bold backdrop-blur-md">
                        <Star className="w-4 h-4 fill-current text-amber-400" />
                        <span>{spotlightRating}/10</span>
                      </div>
                    )}

                    {spotlightGame.release_year && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/50 border border-purple-500/20 text-purple-200">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span>{spotlightGame.release_year}</span>
                      </div>
                    )}

                    {spotlightGame.genres && spotlightGame.genres.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-500/20 text-purple-300 text-xs font-medium"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  {spotlightGame.summary && (
                    <p className="text-sm md:text-base text-purple-100/90 line-clamp-3 leading-relaxed max-w-2xl pt-1">
                      {spotlightGame.summary}
                    </p>
                  )}

                  {/* Platforms Row */}
                  {spotlightGame.platforms && spotlightGame.platforms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs text-purple-400 font-semibold mr-1">Platforms:</span>
                      {spotlightGame.platforms.slice(0, 5).map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 text-xs rounded bg-purple-950/70 border border-purple-500/30 text-purple-200 font-medium"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-3">
                    <Button
                      onClick={() => setSelectedGame(spotlightGame)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/35 gap-2 px-6 py-2.5 text-sm"
                    >
                      <Gamepad2 className="w-4 h-4" />
                      <span>View & Track Game</span>
                    </Button>

                    {!spotlightGame.inLibrary ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleQuickAdd(spotlightGame)}
                        disabled={addingQuickId === spotlightGame.id}
                        className="bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/30 font-semibold gap-2 px-4 py-2.5 text-sm"
                      >
                        <Bookmark className="w-4 h-4 text-purple-400" />
                        <span>{addingQuickId === spotlightGame.id ? "Adding..." : "Add to Backlog"}</span>
                      </Button>
                    ) : (
                      <span className="px-3 py-2 text-xs font-bold rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>In Library • {spotlightGame.libraryStatus || "Tracked"}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Visual Poster Column */}
                <div className="hidden md:flex md:col-span-4 justify-center">
                  {spotlightGame.cover_url && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedGame(spotlightGame)}
                      className="relative w-56 lg:w-64 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-[0_20px_50px_rgba(168,85,247,0.35)] cursor-pointer group transform hover:-translate-y-2 transition-all duration-300"
                    >
                      <img
                        src={spotlightGame.cover_url}
                        alt={spotlightGame.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Gamepad2 className="w-4 h-4 text-purple-400" /> Click to view details
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
          {/* Header Title & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <Gamepad2 className="w-8 h-8 text-purple-400" />
                <span>Games Discovery Hub</span>
              </h2>
              <p className="text-xs md:text-sm text-purple-300/70 mt-1">
                Explore acclaimed titles with RAWG metadata, platforms, and personal tracking.
              </p>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2 w-full md:w-96">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/60" />
                <input
                  type="text"
                  placeholder="Search games by title..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#130E24] border border-purple-500/25 text-white placeholder-purple-300/40 text-sm focus:outline-none focus:border-purple-400 transition-colors shadow-inner"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Toggle Button */}
              <Button
                variant="ghost"
                onClick={() => setShowFilters(!showFilters)}
                className={`relative px-3 py-2.5 rounded-xl border transition-colors ${
                  showFilters || activeFiltersCount > 0
                    ? "bg-purple-600/30 border-purple-400 text-purple-200"
                    : "bg-[#130E24] border-purple-500/25 text-purple-300 hover:text-white"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="p-5 rounded-2xl bg-[#130E24]/90 border border-purple-500/25 space-y-4 backdrop-blur-md shadow-xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/15">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-purple-400" />
                  Filters & Sorting
                </span>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setSelectedGenres([]);
                      setSelectedPlatform("All");
                      setSelectedMode("All");
                      setSelectedEra("all");
                      setSelectedSort("rating_desc");
                    }}
                    className="text-xs text-purple-400 hover:text-purple-200 underline font-medium"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Platform */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-300">Platform</label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-purple-950/40 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p} className="bg-[#130E24]">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Game Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-300">Game Mode</label>
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-purple-950/40 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400"
                  >
                    {MODES.map((m) => (
                      <option key={m} value={m} className="bg-[#130E24]">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Era */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-300">Release Era</label>
                  <select
                    value={selectedEra}
                    onChange={(e) => setSelectedEra(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-purple-950/40 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400"
                  >
                    {ERAS.map((era) => (
                      <option key={era.value} value={era.value} className="bg-[#130E24]">
                        {era.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-300">Sort By</label>
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-purple-950/40 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400"
                  >
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value} className="bg-[#130E24]">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Multi-Select Genre Pills Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300/80 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Select Genres (Multi-Select)
                {selectedGenres.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/30 text-purple-200">
                    {selectedGenres.length} selected
                  </span>
                )}
              </span>

              {selectedGenres.length > 0 && (
                <button
                  onClick={() => setSelectedGenres([])}
                  className="text-xs text-purple-400 hover:text-purple-200 underline"
                >
                  Clear genres
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {/* "All" button */}
              <button
                onClick={() => setSelectedGenres([])}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  selectedGenres.length === 0
                    ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 scale-105"
                    : "bg-purple-950/30 text-purple-300/80 border-purple-500/20 hover:border-purple-400/50"
                }`}
              >
                All Genres
              </button>

              {GENRES.map((g) => {
                const isSelected = selectedGenres.includes(g);
                const isAdultGenre = g.includes("18+");
                return (
                  <button
                    key={g}
                    onClick={() => handleToggleGenre(g)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      isSelected
                        ? isAdultGenre
                          ? "bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/40 scale-105"
                          : "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 scale-105"
                        : isAdultGenre
                        ? "bg-rose-950/40 text-rose-300/90 border-rose-500/30 hover:border-rose-400"
                        : "bg-purple-950/30 text-purple-300/80 border-purple-500/20 hover:border-purple-400/50"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personalized Recommendations Section */}
          {!query && selectedGenres.length === 0 && selectedPlatform === "All" && recommendations.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Recommended For You</span>
                  </h3>
                  <p className="text-xs text-purple-300/60 mt-0.5">
                    Curated based on your library taste & favorite genres • Excludes games you already own
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchRecommendations}
                  disabled={loadingRecs}
                  className="text-xs text-purple-300 hover:text-white hover:bg-purple-900/40 border border-purple-500/20 gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRecs ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {recommendations.slice(0, 6).map((game) => (
                  <GameCard
                    key={`rec-${game.id}`}
                    game={game}
                    onClick={(g) => setSelectedGame(g)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Catalog Section Header */}
          <div className="flex items-center justify-between pt-4 border-t border-purple-500/15">
            <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-purple-400" />
              <span>{query ? `Search Results for "${query}"` : "All Games Catalogue"}</span>
            </h3>

            {games.length > 0 && (
              <span className="text-xs text-purple-300/60 font-medium">
                Showing {games.length} games
              </span>
            )}
          </div>

          {/* Games Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-2xl bg-purple-950/20 border border-purple-500/15 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center text-purple-300 bg-[#130E24]/60 rounded-2xl border border-purple-500/20">
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-purple-400/50" />
              <p className="text-sm">Failed to load games. Please try again.</p>
              <Button onClick={() => fetchGames(1, false)} size="sm" className="mt-4 bg-purple-600 text-white">
                Retry
              </Button>
            </div>
          ) : games.length === 0 ? (
            <div className="p-16 text-center text-purple-300 bg-[#130E24]/60 rounded-2xl border border-purple-500/20">
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-purple-400/50" />
              <p className="text-sm font-semibold">No games found matching your filters.</p>
              <p className="text-xs text-purple-400/60 mt-1">Try clearing some filters or searching for another title.</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setSelectedGenres([]);
                  setSelectedPlatform("All");
                  setSelectedMode("All");
                  setSelectedEra("all");
                }}
                className="mt-4 text-purple-300 border border-purple-500/30 hover:bg-purple-900/40"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {games.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onClick={(g) => setSelectedGame(g)}
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-10 w-full" />

              {/* Loading More Indicator / Load More Button */}
              {loadingMore ? (
                <div className="flex justify-center py-8">
                  <div className="flex items-center gap-2 text-sm text-purple-300 font-medium">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Loading more games...</span>
                  </div>
                </div>
              ) : hasMore ? (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => fetchGames(page + 1, true)}
                    className="px-6 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-200 text-sm font-semibold transition-all hover:scale-105"
                  >
                    Load More Games
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-purple-400/60">
                  You have reached the end of the catalogue.
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal for Details & Library Action */}
        {selectedGame && (
          <GameDetailsModal
            isOpen={Boolean(selectedGame)}
            onClose={() => setSelectedGame(null)}
            gameId={selectedGame.id}
            initialGame={selectedGame}
            onUpdated={() => {
              fetchGames(1, false);
              fetchRecommendations();
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
