"use client";

import { MediaItem, WatchOption, LibraryStatus } from "@/types/media";
import {
  X,
  ExternalLink,
  Bookmark,
  Star,
  Clock,
  Volume2,
  Sparkles,
  Check,
  Eye,
  ShieldCheck,
  Ban,
  Layers,
} from "lucide-react";
import { useState, useEffect } from "react";

interface MovieDetailsModalProps {
  movie: MediaItem | null;
  onClose: () => void;
  onLibraryUpdate?: (tmdbId: string, status: LibraryStatus) => void;
  onQueueToggle?: (tmdbId: string, inQueue: boolean) => void;
}

export function MovieDetailsModal({
  movie,
  onClose,
  onLibraryUpdate,
  onQueueToggle,
}: MovieDetailsModalProps) {
  const [inQueue, setInQueue] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>("none");
  const [userRating, setUserRating] = useState<number | null>(null);
  const [watchOptions, setWatchOptions] = useState<WatchOption[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  useEffect(() => {
    if (!movie) return;

    // Load watch options and user library status
    setIsLoadingLinks(true);
    fetch(`/api/media/${movie.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.watchOptions) {
          setWatchOptions(data.data.watchOptions);
        } else if (movie.watchOptions) {
          setWatchOptions(movie.watchOptions);
        }
      })
      .catch(() => {
        if (movie.watchOptions) setWatchOptions(movie.watchOptions);
      })
      .finally(() => setIsLoadingLinks(false));

    // Fetch user status for this media
    fetch("/api/library")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const match = data.data.find((item: any) => item.id === movie.id || item.userRecord?.tmdbId === movie.id);
          if (match?.userRecord) {
            setInQueue(Boolean(match.userRecord.isInQueue));
            setLibraryStatus(match.userRecord.libraryStatus || "none");
            setUserRating(match.userRecord.userRating || null);
          }
        }
      })
      .catch(() => {});
  }, [movie]);

  if (!movie) return null;

  const handleToggleQueue = async () => {
    const nextState = !inQueue;
    setInQueue(nextState);
    onQueueToggle?.(movie.id, nextState);
    try {
      await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: movie.id, inQueue: nextState }),
      });
      showNotification();
    } catch {}
  };

  const handleUpdateStatus = async (status: LibraryStatus) => {
    setLibraryStatus(status);
    onLibraryUpdate?.(movie.id, status);
    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: movie.id, libraryStatus: status }),
      });
      showNotification();
    } catch {}
  };

  const handleRate = async (rating: number) => {
    setUserRating(rating);
    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: movie.id, userRating: rating }),
      });
      showNotification();
    } catch {}
  };

  const showNotification = () => {
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl my-auto rounded-3xl overflow-hidden glass-panel-elevated bg-[#0F1117]/95 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] z-10 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/60 text-zinc-300 hover:text-white hover:bg-black/90 border border-white/10 transition-all cursor-pointer"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {/* Hero Backdrop Header */}
          <div className="relative h-60 sm:h-72 w-full overflow-hidden shrink-0">
            <img
              src={movie.backdropUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117] via-[#0F1117]/60 to-transparent" />

            {/* Quick Info Overlay */}
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
              <div className="space-y-1.5">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {movie.mediaType === "movie" ? "FEATURE FILM" : "SERIES"}
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold font-['Plus_Jakarta_Sans'] text-white">
                  {movie.title}
                </h2>
                {movie.tagline && (
                  <p className="text-xs text-zinc-400 italic">{movie.tagline}</p>
                )}
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-300">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-bold">
                <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span>{movie.rating.toFixed(1)}</span>
              </div>

              <span className="font-semibold text-zinc-300">{movie.releaseYear}</span>

              {movie.runtime && (
                <span className="flex items-center gap-1 text-zinc-400">
                  <Clock className="w-3.5 h-3.5" />
                  {movie.runtime}
                </span>
              )}

              {movie.badge && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 border border-white/15">
                  {movie.badge}
                </span>
              )}

              {movie.audio && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-black/40 border border-white/5 text-zinc-400">
                  <Volume2 className="w-3 h-3" />
                  {movie.audio}
                </span>
              )}

              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                {movie.genres.map((g) => (
                  <span key={g} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 text-[11px]">
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Overview */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Synopsis</h4>
              <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-['Inter']">
                {movie.overview}
              </p>
            </div>

            {/* Taste Match Pill */}
            {movie.recommendationReason && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-200">
                  <span className="font-bold block text-emerald-300">Curated Taste Affinity:</span>
                  {movie.recommendationReason}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                WATCH OPTIONS SECTION (CONFIGURABLE DATABASE LINKS)
               ══════════════════════════════════════════════════════════════ */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white font-['Plus_Jakarta_Sans']">
                    Configured Watch Options
                  </h4>
                </div>
                <span className="text-[11px] text-zinc-400">
                  External links stored in Baserow
                </span>
              </div>

              {isLoadingLinks ? (
                <div className="p-4 rounded-xl glass-panel text-center text-xs text-zinc-400 animate-pulse">
                  Querying verified watch providers from database...
                </div>
              ) : watchOptions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {watchOptions.map((opt) => (
                    <a
                      key={opt.linkId}
                      href={opt.directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-3 rounded-xl glass-panel bg-[#151822]/80 border border-white/10 hover:border-emerald-500/40 hover:bg-[#1a1f2c] transition-all flex items-center justify-between gap-3 shadow-lg"
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-100 group-hover:text-emerald-300 transition-colors truncate">
                            {opt.providerName}
                          </span>
                          {opt.isVerified && (
                            <span title="Verified link">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          {opt.qualityLabel && (
                            <span className="font-mono text-emerald-400/90">{opt.qualityLabel}</span>
                          )}
                          {opt.badgeLabel && <span>• {opt.badgeLabel}</span>}
                          {opt.languageAudio && <span className="truncate">• {opt.languageAudio}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                        <span>Open</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl glass-panel bg-white/[0.02] border border-white/5 text-center text-xs text-zinc-400 space-y-1">
                  <p className="text-zinc-300 font-medium">No external watch links currently configured for this title.</p>
                  <p className="text-[11px] text-zinc-500">
                    Links are managed via the Curator Admin panel and stored in Baserow.
                  </p>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                USER ACTIONS (QUEUE, STATUS, RATING)
               ══════════════════════════════════════════════════════════════ */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Queue Toggle */}
                <button
                  onClick={handleToggleQueue}
                  className={`px-4 py-2.5 rounded-xl font-['Plus_Jakarta_Sans'] font-semibold text-xs glass-pill flex items-center gap-2 transition-all cursor-pointer ${
                    inQueue
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                      : "text-zinc-200"
                  }`}
                >
                  {inQueue ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      In Your Queue
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      Add to Queue
                    </>
                  )}
                </button>

                {/* Library Status Dropdown */}
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  <select
                    value={libraryStatus}
                    onChange={(e) => handleUpdateStatus(e.target.value as LibraryStatus)}
                    className="px-3 py-2 rounded-xl bg-[#151821] border border-white/10 text-xs text-zinc-200 font-medium focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="none">Not in Library</option>
                    <option value="watching">Watching</option>
                    <option value="completed">Completed</option>
                    <option value="plan_to_watch">Plan to Watch</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>

                {/* Star Rating Selector (1-10) */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-zinc-400 mr-1">Your Rating:</span>
                  {[2, 4, 6, 8, 10].map((starVal) => {
                    const isRated = userRating !== null && userRating >= starVal;
                    return (
                      <button
                        key={starVal}
                        onClick={() => handleRate(starVal)}
                        className="p-1 text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
                        title={`Rate ${starVal}/10`}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isRated ? "fill-emerald-400 text-emerald-400" : "text-zinc-600"
                          }`}
                        />
                      </button>
                    );
                  })}
                  {userRating && (
                    <span className="text-xs font-bold text-emerald-400 ml-1 font-mono">
                      {userRating}/10
                    </span>
                  )}
                </div>
              </div>

              {isSavedNotice && (
                <div className="text-right text-[11px] text-emerald-400 font-medium animate-fadeIn">
                  ✓ Saved to taste profile in Baserow
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
