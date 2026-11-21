"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { GameDetailsModal } from "@/components/GameDetailsModal";
import { Search, Gamepad2, Sparkles, Filter, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useScreenContext } from "@/lib/screenContext";
import type { GameItem, GameBrowseResult } from "@/features/games/gameTypes";

const GENRES = [
  "All",
  "Role-playing (RPG)",
  "Action",
  "Adventure",
  "Shooter",
  "Strategy",
  "Platform",
  "Indie",
  "Puzzle",
  "Racing",
  "Simulator",
  "Sport",
  "Fighting",
];

const PLATFORMS = [
  "All",
  "PC (Microsoft Windows)",
  "PlayStation 5",
  "PlayStation 4",
  "Xbox Series X|S",
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
  { value: "classic", label: "Classic (<2010)" },
];

const SORTS = [
  { value: "rating_desc", label: "Highest Rated" },
  { value: "release_desc", label: "Newest First" },
  { value: "release_asc", label: "Oldest First" },
  { value: "name_asc", label: "Title (A-Z)" },
];

export default function GamesBrowsePage() {
  const { setScreenDetails } = useScreenContext();
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");
  const [selectedEra, setSelectedEra] = useState("all");
  const [selectedSort, setSelectedSort] = useState("rating_desc");
  const [showFilters, setShowFilters] = useState(false);

  // Selected game for modal
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);

  // Update screen context for CineTaste chat
  useEffect(() => {
    setScreenDetails({
      category: "games",
      searchQuery: query || undefined,
      appliedFilters: {
        genres: selectedGenre !== "All" ? [selectedGenre] : undefined,
        era: selectedEra !== "all" ? selectedEra : undefined,
        sort: selectedSort,
      },
    });
  }, [setScreenDetails, query, selectedGenre, selectedEra, selectedSort]);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (selectedGenre !== "All") params.set("genre", selectedGenre);
      if (selectedPlatform !== "All") params.set("platform", selectedPlatform);
      if (selectedMode !== "All") params.set("game_mode", selectedMode);
      if (selectedEra !== "all") params.set("era", selectedEra);
      if (selectedSort) params.set("sort", selectedSort);

      const res = await fetch(`/api/games/browse?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch games");
      const json = await res.json();
      const data: GameBrowseResult = json.data || json;
      setGames(data.games || data.items || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [query, selectedGenre, selectedPlatform, selectedMode, selectedEra, selectedSort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGames();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchGames]);

  // Spotlight game is the highest rated game in the list or top result
  const spotlightGame = games.length > 0 ? games[0] : null;

  return (
    <AppShell>
      <div className="min-h-screen bg-[#080511] text-[#F5F7F6] pb-24">
        {/* Spotlight Hero Section */}
        {spotlightGame && !query && selectedGenre === "All" && selectedPlatform === "All" && (
          <div className="relative w-full h-[380px] md:h-[460px] overflow-hidden border-b border-purple-500/20 bg-gradient-to-b from-[#160E2E] to-[#080511]">
            {/* Background Backdrop Blur */}
            {spotlightGame.cover_url && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl scale-110 pointer-events-none"
                style={{ backgroundImage: `url(${spotlightGame.cover_url})` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080511] via-[#080511]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080511] via-[#080511]/80 to-transparent" />

            <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center">
              <div className="max-w-2xl space-y-4 pt-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 border border-purple-500/40 text-purple-300 backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Featured Gaming Spotlight</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
                  {spotlightGame.title}
                </h1>

                {spotlightGame.summary && (
                  <p className="text-sm md:text-base text-purple-200/80 line-clamp-3 leading-relaxed max-w-xl">
                    {spotlightGame.summary}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    onClick={() => setSelectedGame(spotlightGame)}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30 gap-2 px-5 py-2.5"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>View & Track Game</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
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

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`border-purple-500/30 text-purple-300 hover:bg-purple-950/40 gap-1.5 h-10 px-3 ${
                  showFilters ? "bg-purple-600/20 border-purple-400 text-purple-200" : ""
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
            </div>
          </div>

          {/* Collapsible Filter Bar */}
          {showFilters && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#130E24]/90 border border-purple-500/30 space-y-4 animate-in fade-in duration-200 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-purple-400" />
                  <span>Category & Platform Filters</span>
                </span>
                <button
                  onClick={() => {
                    setSelectedGenre("All");
                    setSelectedPlatform("All");
                    setSelectedMode("All");
                    setSelectedEra("all");
                    setSelectedSort("rating_desc");
                  }}
                  className="text-xs text-purple-400 hover:text-purple-200 underline"
                >
                  Reset all
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

              {/* Genre Pills */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-purple-300">Genres</label>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGenre(g)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                        selectedGenre === g
                          ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30"
                          : "bg-purple-950/30 text-purple-300/80 border-purple-500/20 hover:border-purple-400/50"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
              <Button onClick={() => fetchGames()} size="sm" className="mt-4 bg-purple-600 text-white">
                Retry
              </Button>
            </div>
          ) : games.length === 0 ? (
            <div className="p-16 text-center text-purple-300 bg-[#130E24]/60 rounded-2xl border border-purple-500/20">
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-purple-400/50" />
              <p className="text-sm font-semibold">No games found matching your filters.</p>
              <p className="text-xs text-purple-400/60 mt-1">Try clearing some filters or searching for another title.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onClick={(g) => setSelectedGame(g)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal for Details & Library Action */}
        {selectedGame && (
          <GameDetailsModal
            isOpen={Boolean(selectedGame)}
            onClose={() => setSelectedGame(null)}
            gameId={selectedGame.id}
            initialGame={selectedGame}
            onUpdated={() => fetchGames()}
          />
        )}
      </div>
    </AppShell>
  );
}
