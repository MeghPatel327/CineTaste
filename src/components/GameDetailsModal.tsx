"use client";

import { useEffect, useState, useCallback } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Star, Clock, Calendar, ExternalLink, Plus, Edit, Trash2, X, Gamepad2, Layers } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { GameItem, GameDetails, GameStatus } from "@/features/games/gameTypes";

interface GameDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: number;
  initialGame?: GameItem | null;
  onUpdated?: () => void;
}

const statusOptions: { value: GameStatus; label: string }[] = [
  { value: "playing", label: "Playing" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Backlog / Plan to Play" },
  { value: "on_hold", label: "On Hold" },
  { value: "dropped", label: "Dropped" },
];

export function GameDetailsModal({
  isOpen,
  onClose,
  gameId,
  initialGame,
  onUpdated,
}: GameDetailsModalProps) {
  const [data, setData] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [rating, setRating] = useState(0);
  const [playtimeHours, setPlaytimeHours] = useState<number | undefined>(undefined);
  const [personalReview, setPersonalReview] = useState("");

  const resetForm = useCallback(() => {
    setIsAdding(false);
    setIsEditing(false);
    setStatus("playing");
    setRating(0);
    setPlaytimeHours(undefined);
    setPersonalReview("");
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setData(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    async function loadData() {
      try {
        const res = await fetch(`/api/games/${gameId}`);
        if (!res.ok) throw new Error("Failed to load game details");
        const json = await res.json();
        if (!active) return;
        const gameData = json.data || json.game || json;
        setData(gameData);

        if (gameData?.libraryData) {
          const lib = gameData.libraryData;
          setStatus(lib.status || "playing");
          setRating(lib.rating || 0);
          setPlaytimeHours(lib.playtime_hours);
          setPersonalReview(lib.personal_review || "");
        } else {
          resetForm();
        }
      } catch {
        if (!active) return;
        if (initialGame) {
          setData({
            ...initialGame,
            genres: initialGame.genres || [],
            platforms: initialGame.platforms || [],
            game_modes: initialGame.game_modes || [],
            themes: initialGame.themes || [],
            developers: initialGame.developers || (initialGame.developer ? [initialGame.developer] : []),
            publishers: initialGame.publishers || (initialGame.publisher ? [initialGame.publisher] : []),
            screenshots: [],
            artworks: [],
            similar_games: [],
          });
        } else {
          setError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [isOpen, gameId, initialGame, resetForm]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setSaving(true);

    try {
      if (data.libraryData?.id) {
        // Update existing item
        const res = await fetch(`/api/games/library/${data.libraryData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            rating,
            playtime_hours: playtimeHours,
            personal_review: personalReview,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to update game");
        }

        toast.success(`Updated ${data.title}`);
      } else {
        // Add new item
        const res = await fetch("/api/games/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            igdb_id: data.id,
            title: data.title,
            status,
            rating,
            playtime_hours: playtimeHours,
            personal_review: personalReview,
            genres: data.genres,
            platforms: data.platforms,
            release_year: data.release_year,
            cover_url: data.cover_url,
            summary: data.summary,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to add game to library");
        }

        toast.success(`Added ${data.title} to your library`);
      }

      setIsAdding(false);
      setIsEditing(false);
      onUpdated?.();

      // Refresh local game data
      const refreshRes = await fetch(`/api/games/${gameId}`);
      if (refreshRes.ok) {
        const json = await refreshRes.json();
        setData(json.data || json.game || json);
      }
    } catch (err: any) {
      toast.error(err.message || "Error saving game");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!data?.libraryData?.id) return;
    if (!confirm(`Are you sure you want to remove "${data.title}" from your library?`)) return;

    setRemoving(true);
    try {
      const res = await fetch(`/api/games/library/${data.libraryData.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove game");

      toast.success(`Removed ${data.title} from library`);
      setIsEditing(false);
      onUpdated?.();

      // Refresh
      const refreshRes = await fetch(`/api/games/${gameId}`);
      if (refreshRes.ok) {
        const json = await refreshRes.json();
        setData(json.data || json.game || json);
        resetForm();
      }
    } catch (err: any) {
      toast.error(err.message || "Error removing game");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={data?.title || "Game Details"} maxWidth="max-w-3xl">
      {loading ? (
        <div className="p-8 space-y-4 animate-pulse">
          <div className="h-48 bg-purple-950/20 rounded-xl" />
          <div className="h-6 bg-purple-950/30 rounded w-1/2" />
          <div className="h-4 bg-purple-950/20 rounded w-3/4" />
        </div>
      ) : error || !data ? (
        <div className="p-8 text-center text-purple-300">
          <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-purple-400/50" />
          <p>Failed to load game information.</p>
        </div>
      ) : (
        <div className="space-y-6 text-[#F5F7F6]">
          {/* Hero Banner with Cover & Quick Info */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1B1333] to-[#0B0813] border border-purple-500/20 p-5 md:p-6 flex flex-col md:flex-row gap-5">
            {/* Cover Image */}
            <div className="relative w-36 md:w-44 aspect-[3/4] shrink-0 rounded-xl overflow-hidden shadow-2xl border border-purple-500/30 bg-[#0B0813]">
              {data.cover_url ? (
                <img src={data.cover_url} alt={data.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-purple-400/40">
                  <Gamepad2 className="w-10 h-10" />
                </div>
              )}
            </div>

            {/* Quick Metadata */}
            <div className="flex-1 flex flex-col justify-between space-y-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">{data.title}</h2>
                {data.release_date && (
                  <p className="text-xs text-purple-300/70 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Released: {data.release_date}</span>
                  </p>
                )}
              </div>

              {/* Developer / Publisher */}
              {(data.developers?.length || data.publishers?.length) && (
                <div className="text-xs space-y-1 text-purple-200/80">
                  {data.developers?.length ? (
                    <p>
                      <span className="text-purple-400 font-medium">Developer:</span>{" "}
                      {data.developers.join(", ")}
                    </p>
                  ) : null}
                  {data.publishers?.length ? (
                    <p>
                      <span className="text-purple-400 font-medium">Publisher:</span>{" "}
                      {data.publishers.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}

              {/* Genres */}
              {data.genres && data.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.genres.map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {data.libraryData ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsEditing(!isEditing);
                        setIsAdding(false);
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{isEditing ? "Close Form" : "Edit"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRemove}
                      disabled={removing}
                      className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{removing ? "Removing..." : "Remove"}</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsAdding(!isAdding);
                      setIsEditing(false);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAdding ? "Cancel" : "Add to Library"}</span>
                  </Button>
                )}

                {data.url && (
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-purple-300 hover:text-white bg-white/[0.05] hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                  >
                    <span>IGDB</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Library Status Banner (if tracked) */}
          {data.libraryData && !isEditing && (
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-purple-300/80 font-medium">Your Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-500/40">
                    {data.libraryData.status}
                  </span>
                </div>
                {data.libraryData.personal_review && (
                  <p className="text-xs text-purple-200/90 italic pt-1">
                    "{data.libraryData.personal_review}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-purple-300">
                {data.libraryData.rating ? (
                  <div className="flex items-center gap-1 text-amber-300 font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{data.libraryData.rating}/10</span>
                  </div>
                ) : null}
                {data.libraryData.playtime_hours ? (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span>{data.libraryData.playtime_hours} hrs</span>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Add / Edit Form */}
          {(isAdding || isEditing) && (
            <form
              onSubmit={handleSave}
              className="p-5 rounded-2xl bg-[#130E24] border border-purple-500/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300">
                  {isEditing ? "Edit Game Record" : "Add Game to Library"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className="text-purple-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-300">Tracking Status</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={cn(
                        "px-3 py-2 text-xs font-medium rounded-xl border transition-all text-left truncate",
                        status === opt.value
                          ? "bg-purple-600/30 text-purple-200 border-purple-400 shadow-md shadow-purple-600/20 font-bold"
                          : "bg-purple-950/30 text-purple-300/70 border-purple-500/20 hover:border-purple-400/50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating & Playtime Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-300 flex items-center justify-between">
                    <span>Personal Rating (0 - 10)</span>
                    <span className="text-amber-400 font-bold">{rating ? `${rating}/10` : "Unrated"}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-300">Hours Played (approx)</label>
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    placeholder="e.g. 45"
                    value={playtimeHours ?? ""}
                    onChange={(e) =>
                      setPlaytimeHours(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-purple-950/40 border border-purple-500/30 text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Notes / Review */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-300">Notes / Personal Review</label>
                <textarea
                  rows={3}
                  placeholder="Your thoughts, memorable moments, or build details..."
                  value={personalReview}
                  onChange={(e) => setPersonalReview(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-purple-950/40 border border-purple-500/30 text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className="border-purple-500/30 text-purple-300 hover:bg-purple-950/40"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30"
                >
                  {saving ? "Saving..." : isEditing ? "Save Changes" : "Confirm Add"}
                </Button>
              </div>
            </form>
          )}

          {/* Platforms */}
          {data.platforms && data.platforms.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Available Platforms</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.platforms.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 text-xs rounded-lg bg-purple-950/40 border border-purple-500/20 text-purple-200"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {data.summary && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">About the Game</h4>
              <p className="text-xs md:text-sm text-purple-100/90 leading-relaxed whitespace-pre-line bg-purple-950/20 p-4 rounded-xl border border-purple-500/10">
                {data.summary}
              </p>
            </div>
          )}

          {/* Screenshots Gallery */}
          {data.screenshots && data.screenshots.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Screenshots</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.screenshots.map((s, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-xl overflow-hidden border border-purple-500/20 bg-black/40 group"
                  >
                    <img
                      src={s}
                      alt={`${data.title} screenshot ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
