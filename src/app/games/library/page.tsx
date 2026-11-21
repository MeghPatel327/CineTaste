"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { GameDetailsModal } from "@/components/GameDetailsModal";
import { Modal } from "@/components/ui/Modal";
import {
  Disc3,
  Search,
  Plus,
  Filter,
  Gamepad2,
  X,
  PlayCircle,
  CheckCircle2,
  Bookmark,
  PauseCircle,
  XCircle,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useScreenContext } from "@/lib/screenContext";
import type { GameItem, GameStatus } from "@/features/games/gameTypes";

const STATUS_TABS: { value: "all" | GameStatus; label: string; icon: any }[] = [
  { value: "all", label: "All Games", icon: Disc3 },
  { value: "playing", label: "Playing", icon: PlayCircle },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
  { value: "pending", label: "Backlog", icon: Bookmark },
  { value: "on_hold", label: "On Hold", icon: PauseCircle },
  { value: "dropped", label: "Dropped", icon: XCircle },
];

export default function GameLibraryPage() {
  const { setScreenDetails } = useScreenContext();
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | GameStatus>("all");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  // Selected game for detail modal
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);

  // "Add Game" search modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [addSearchResults, setAddSearchResults] = useState<GameItem[]>([]);
  const [addSearchLoading, setAddSearchLoading] = useState(false);

  useEffect(() => {
    setScreenDetails({
      category: "games",
    });
  }, [setScreenDetails]);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/games/library");
      if (!res.ok) throw new Error("Failed to load game library");
      const json = await res.json();
      const data = json.data || json;
      const rawList: GameItem[] = data.games || (Array.isArray(data) ? data : []);
      const mappedGames = rawList.map((g) => ({
        ...g,
        status: g.status || g.libraryStatus || ("playing" as GameStatus),
      }));
      setGames(mappedGames);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Extract all unique platforms in the library
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      (g.platforms || []).forEach((p) => set.add(p));
    });
    return Array.from(set).sort();
  }, [games]);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    return games
      .filter((g) => {
        if (statusFilter !== "all" && g.status !== statusFilter) return false;
        if (platformFilter !== "all" && !(g.platforms || []).includes(platformFilter)) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const titleMatches = g.title.toLowerCase().includes(q);
          const genreMatches = (g.genres || []).some((genre) => genre.toLowerCase().includes(q));
          if (!titleMatches && !genreMatches) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "rating_desc") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "title_asc") return a.title.localeCompare(b.title);
        if (sortBy === "release_desc") return (b.release_year || 0) - (a.release_year || 0);
        // Default recent
        return 0;
      });
  }, [games, statusFilter, platformFilter, search, sortBy]);

  // Handle live search in the "Add Game" modal
  useEffect(() => {
    if (!isAddModalOpen || !addSearchQuery.trim()) {
      setAddSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setAddSearchLoading(true);
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(addSearchQuery.trim())}`);
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          setAddSearchResults(data.games || data.items || (Array.isArray(data) ? data : []));
        }
      } catch {
        setAddSearchResults([]);
      } finally {
        setAddSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isAddModalOpen, addSearchQuery]);

  return (
    <AppShell>
      <div className="min-h-screen bg-[#080511] text-[#F5F7F6] pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 border border-purple-500/40 text-purple-300 mb-2">
                <Disc3 className="w-3.5 h-3.5 text-purple-400" />
                <span>Personal Collection</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <span>My Game Library</span>
                <span className="text-lg font-bold text-purple-400">({games.length})</span>
              </h1>
              <p className="text-xs md:text-sm text-purple-300/70 mt-1">
                Your personal collection of playing, completed, backlog, and dropped video games.
              </p>
            </div>

            <Button
              onClick={() => {
                setAddSearchQuery("");
                setAddSearchResults([]);
                setIsAddModalOpen(true);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30 gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Game to Library</span>
            </Button>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.value;
              const count =
                tab.value === "all"
                  ? games.length
                  : games.filter((g) => g.status === tab.value).length;

              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    active
                      ? "bg-purple-600/30 text-purple-200 border-purple-400 shadow-md shadow-purple-600/20"
                      : "bg-[#130E24] text-purple-300/70 border-purple-500/20 hover:border-purple-400/50 hover:text-white"
                  }`}
                >
                  <tab.icon className={`w-3.5 h-3.5 ${active ? "text-purple-300" : "text-purple-400"}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      active ? "bg-purple-500/40 text-white" : "bg-purple-950/60 text-purple-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sub-filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#130E24] p-3 rounded-2xl border border-purple-500/20 shadow-md">
            {/* Search within library */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/60" />
              <input
                type="text"
                placeholder="Filter library by title or genre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-purple-950/40 border border-purple-500/30 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Platform selector */}
              {availablePlatforms.length > 0 && (
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-purple-950/40 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="all">All Platforms</option>
                  {availablePlatforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-purple-950/40 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400"
              >
                <option value="recent">Recently Added</option>
                <option value="rating_desc">Highest Rating</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="release_desc">Release Year</option>
              </select>
            </div>
          </div>

          {/* Library Content Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-pulse">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-2xl bg-purple-950/20 border border-purple-500/15"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center text-purple-300 bg-[#130E24]/60 rounded-2xl border border-purple-500/20">
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-purple-400/50" />
              <p className="text-sm">Failed to load game library.</p>
              <Button onClick={() => fetchLibrary()} size="sm" className="mt-4 bg-purple-600 text-white">
                Retry
              </Button>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="p-16 text-center text-purple-300 bg-[#130E24]/60 rounded-2xl border border-purple-500/20 space-y-3">
              <Gamepad2 className="w-12 h-12 mx-auto text-purple-400/50" />
              <h3 className="text-base font-bold text-white">No games in this section</h3>
              <p className="text-xs text-purple-400/70 max-w-sm mx-auto">
                {search || statusFilter !== "all" || platformFilter !== "all"
                  ? "No titles matched the active filters."
                  : "Your game library is empty. Start adding games from the discovery hub or search dialog."}
              </p>
              <Button
                onClick={() => {
                  setAddSearchQuery("");
                  setAddSearchResults([]);
                  setIsAddModalOpen(true);
                }}
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Game</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onClick={(g) => setSelectedGame(g)}
                  userStatus={game.status}
                  userRating={game.rating}
                />
              ))}
            </div>
          )}
        </div>

        {/* Selected Game Details / Edit Modal */}
        {selectedGame && (
          <GameDetailsModal
            isOpen={Boolean(selectedGame)}
            onClose={() => setSelectedGame(null)}
            gameId={selectedGame.id}
            initialGame={selectedGame}
            onUpdated={() => fetchLibrary()}
          />
        )}

        {/* Live RAWG Search & Add Game Modal */}
        {isAddModalOpen && (
          <Modal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            title="Search & Add Game to Library"
            maxWidth="max-w-2xl"
          >
            <div className="space-y-4 text-[#F5F7F6]">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/60" />
                <input
                  type="text"
                  placeholder="Type any video game title (e.g. Elden Ring, Hollow Knight)..."
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl bg-purple-950/40 border border-purple-500/30 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 shadow-inner"
                />
                {addSearchQuery && (
                  <button
                    onClick={() => setAddSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Results */}
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {addSearchLoading ? (
                  <div className="p-8 text-center text-xs text-purple-300 animate-pulse">
                    Searching RAWG metadata database...
                  </div>
                ) : addSearchResults.length > 0 ? (
                  addSearchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setIsAddModalOpen(false);
                        setSelectedGame(item);
                      }}
                      className="p-3 rounded-xl bg-[#130E24] hover:bg-purple-950/50 border border-purple-500/20 hover:border-purple-400/60 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 rounded-lg bg-black/40 overflow-hidden shrink-0 border border-purple-500/20">
                          {item.cover_url ? (
                            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-purple-400/40">
                              <Gamepad2 className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-xs text-purple-300/60 mt-0.5">
                            {item.release_year || "Unknown"}
                            {item.genres?.length ? ` • ${item.genres.slice(0, 2).join(", ")}` : ""}
                          </p>
                        </div>
                      </div>

                      <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select</span>
                      </Button>
                    </div>
                  ))
                ) : addSearchQuery.trim() ? (
                  <div className="p-8 text-center text-xs text-purple-300/60">
                    No results found for "{addSearchQuery}".
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-purple-300/50">
                    Search for any game to view its RAWG details and add it to your library.
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
