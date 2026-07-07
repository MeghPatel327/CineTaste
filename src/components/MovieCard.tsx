"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  id: number;
  title: string;
  posterUrl?: string | null;
  mediaType?: "movie" | "tv" | string;
  releaseYear?: number;
  voteAverage?: number;
  score?: number;
  showScore?: boolean;
  dimmed?: boolean;
  genres?: string[];
  onClick: (id: number, type: "movie" | "series") => void;
  onFocusEnter?: () => void;
  onFocusLeave?: () => void;
}

export function MovieCard({
  id,
  title,
  posterUrl,
  mediaType = "movie",
  releaseYear,
  voteAverage,
  score,
  showScore = false,
  dimmed = false,
  genres,
  onClick,
  onFocusEnter,
  onFocusLeave,
}: MovieCardProps) {
  // "loading" → skeleton visible, image not yet shown
  // "revealed" → image fades in (opacity 0→1), blur overlay fades out
  // "loaded"   → fully sharp, hover enabled
  const [imgPhase, setImgPhase] = useState<"loading" | "revealed" | "loaded">("loading");
  // Drive click-scale via a data attribute so CSS handles it, no style conflict
  const [clicking, setClicking] = useState(false);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSeries = mediaType === "tv";

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    focusTimer.current = setTimeout(() => onFocusEnter?.(), 300);
  }, [onFocusEnter]);

  const handleMouseLeave = useCallback(() => {
    if (focusTimer.current) { clearTimeout(focusTimer.current); focusTimer.current = null; }
    onFocusLeave?.();
  }, [onFocusLeave]);

  const handleClick = useCallback(() => {
    if (clicking) return;
    setClicking(true);
    setTimeout(() => setClicking(false), 140);
    onClick(id, isSeries ? "series" : "movie");
  }, [id, isSeries, clicking, onClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); }
  }, [handleClick]);

  const handleImageLoad = useCallback(() => {
    // Phase 1: image becomes visible (still blurred by the overlay)
    setImgPhase("revealed");
    // Phase 2: after brief pause, mark fully loaded so blur overlay disappears
    setTimeout(() => setImgPhase("loaded"), 80);
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title}${releaseYear ? `, ${releaseYear}` : ""} · ${isSeries ? "Series" : "Movie"}`}
      data-clicking={clicking ? "true" : undefined}
      data-dimmed={dimmed ? "true" : undefined}
      className={cn(
        "ct-movie-card group relative w-36 md:w-44 shrink-0 rounded-xl cursor-pointer select-none outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* ── Poster ── */}
      <div className="relative overflow-hidden rounded-xl aspect-[2/3]">

        {/* Skeleton — visible until image loads */}
        <div className={cn(
          "absolute inset-0 rounded-xl bg-secondary",
          "transition-opacity duration-300",
          imgPhase !== "loading" ? "opacity-0 pointer-events-none" : "skeleton"
        )} />

        {/* Poster image — opacity-based reveal, filter purely from CSS hover */}
        {posterUrl && imgPhase !== "loading" || (posterUrl && imgPhase === "loading") ? (
          posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              className={cn(
                "ct-poster-img absolute inset-0 w-full h-full object-cover rounded-xl",
                // Fade in on reveal
                imgPhase === "loading" ? "opacity-0" : "opacity-100"
              )}
              onLoad={handleImageLoad}
              onError={() => setImgPhase("loaded")}
            />
          ) : null
        ) : null}

        {/* No-poster fallback */}
        {!posterUrl && (
          <div className="absolute inset-0 bg-secondary rounded-xl flex items-center justify-center text-xs text-muted-foreground">
            No Poster
          </div>
        )}

        {/* Blur overlay — fades out as image sharpens (separate from hover filter) */}
        {posterUrl && (
          <div className={cn(
            "absolute inset-0 rounded-xl pointer-events-none",
            "backdrop-blur-sm bg-black/10",
            "transition-opacity duration-300",
            imgPhase === "loaded" ? "opacity-0" : "opacity-100"
          )} />
        )}

        {/* Bottom gradient — always on, brightens on hover */}
        <div className={cn(
          "ct-poster-gradient absolute inset-x-0 bottom-0 h-[55%] rounded-b-xl pointer-events-none",
          "bg-gradient-to-t from-black/80 via-black/35 to-transparent"
        )} />

        {/* Match score badge */}
        {showScore && score !== undefined && (
          <div className="match-badge ct-badge absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white">
            {score}%
          </div>
        )}

        {/* TMDB rating badge */}
        {!showScore && voteAverage && voteAverage > 0 && (
          <div className="ct-badge absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            {voteAverage.toFixed(1)}
          </div>
        )}
      </div>

      {/* ── Text ── */}
      <div className="pt-2 pb-1 px-0.5">
        <p className="ct-card-title font-semibold text-sm line-clamp-2 leading-snug opacity-95">
          {title}
        </p>
        <div className="ct-card-meta flex items-center gap-1.5 mt-1.5 flex-wrap opacity-85">
          <span className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
            isSeries ? "bg-purple-500/20 text-purple-400" : "bg-primary/20 text-primary"
          )}>
            {isSeries ? "Series" : "Movie"}
          </span>
          {releaseYear && releaseYear > 0 && (
            <span className="text-xs text-muted-foreground">{releaseYear}</span>
          )}
        </div>
        {genres && genres.length > 0 && (
          <p className="ct-card-meta text-[11px] text-muted-foreground mt-1 line-clamp-1 opacity-85">
            {genres.slice(0, 3).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
