"use client";

import { useRef, useState, useCallback } from "react";
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
  /** When true the card is part of a row that applies focus dimming to siblings */
  inRow?: boolean;
  /** Called by the row context to dim/undim this card */
  dimmed?: boolean;
  genres?: string[];
  runtime?: number;
  onClick: (id: number, type: "movie" | "series") => void;
  onFocusEnter?: () => void;
  onFocusLeave?: () => void;
}

/**
 * Premium CineTaste movie card.
 *
 * Visual hierarchy:
 *  - Poster: scale + brightness on hover (GPU: transform + filter)
 *  - Card:   translateY(-6px) + stronger shadow + green border
 *  - Signature focus: neighbouring cards dim slightly (controlled by parent row)
 *  - Bottom gradient always present, strengthens on hover
 *  - Title translates up 3px on hover
 *  - Metadata fades in on hover
 *  - Match badge scales 1.05 on hover
 *  - Click: scale 0.98 → 1 (120ms)
 *  - Progressive poster: skeleton → blurred → sharp
 */
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
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error">("loading");
  const [isClicked, setIsClicked] = useState(false);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSeries = mediaType === "tv";
  const mediaLabel = isSeries ? "Series" : "Movie";

  const handleMouseEnter = useCallback(() => {
    focusTimer.current = setTimeout(() => {
      onFocusEnter?.();
    }, 300);
  }, [onFocusEnter]);

  const handleMouseLeave = useCallback(() => {
    if (focusTimer.current) {
      clearTimeout(focusTimer.current);
      focusTimer.current = null;
    }
    onFocusLeave?.();
  }, [onFocusLeave]);

  const handleClick = useCallback(() => {
    if (isClicked) return;
    setIsClicked(true);
    // scale 0.98 → back to 1 in 120ms
    setTimeout(() => setIsClicked(false), 120);
    onClick(id, isSeries ? "series" : "movie");
  }, [id, isSeries, isClicked, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title}${releaseYear ? `, ${releaseYear}` : ""}${isSeries ? " · Series" : " · Movie"}`}
      className={cn(
        "ct-movie-card group relative shrink-0 w-36 md:w-44 outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "rounded-xl cursor-pointer select-none",
        dimmed && "ct-movie-card--dimmed"
      )}
      style={{ transform: isClicked ? "scale(0.98)" : undefined, transition: isClicked ? "transform 120ms ease-out" : undefined }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* ── Poster frame ── */}
      <div className="poster-frame ct-poster-wrap relative overflow-hidden rounded-xl">

        {/* Skeleton placeholder */}
        {imgState === "loading" && (
          <div className="ct-poster-skeleton absolute inset-0 rounded-xl bg-secondary skeleton" />
        )}

        {/* Poster image */}
        {posterUrl && imgState !== "error" ? (
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            className={cn(
              "ct-poster-img w-full aspect-[2/3] object-cover rounded-xl",
              "transition-[transform,filter] duration-[250ms] ease-out will-change-transform",
              "group-hover:scale-[1.04] group-hover:brightness-[1.05] group-hover:contrast-[1.03] group-hover:saturate-[1.02]",
              imgState === "loaded" ? "opacity-100" : "opacity-0"
            )}
            style={{
              // blur during loading, sharp when loaded
              filter: imgState === "loaded"
                ? "none"
                : "blur(8px) brightness(0.8)",
            }}
            onLoad={() => setImgState("loaded")}
            onError={() => setImgState("error")}
          />
        ) : (
          imgState === "error" || !posterUrl ? (
            <div className="w-full aspect-[2/3] bg-secondary rounded-xl flex items-center justify-center text-xs text-muted-foreground">
              No Poster
            </div>
          ) : null
        )}

        {/* Bottom gradient — always present, strengthens on hover */}
        <div className={cn(
          "ct-poster-gradient absolute inset-x-0 bottom-0 rounded-b-xl pointer-events-none",
          "h-2/5",
          "bg-gradient-to-t from-black/75 via-black/30 to-transparent",
          "transition-opacity duration-[250ms] ease-out",
          "opacity-80 group-hover:opacity-100"
        )} />

        {/* Match score badge */}
        {showScore && score !== undefined && (
          <div className={cn(
            "match-badge absolute top-2 right-2",
            "px-2 py-0.5 rounded-full text-xs font-bold text-white",
            "transition-[transform,box-shadow] duration-[250ms] ease-out",
            "group-hover:scale-105"
          )}>
            {score}%
          </div>
        )}

        {/* TMDB rating badge (when no match score) */}
        {!showScore && voteAverage && voteAverage > 0 ? (
          <div className={cn(
            "absolute top-2 right-2",
            "bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full",
            "flex items-center gap-1",
            "transition-[transform,box-shadow] duration-[250ms] ease-out",
            "group-hover:scale-105"
          )}>
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            {voteAverage.toFixed(1)}
          </div>
        ) : null}
      </div>

      {/* ── Text content ── */}
      <div className="pt-2 pb-1 px-0.5">
        {/* Title */}
        <p className={cn(
          "font-semibold text-sm line-clamp-2 leading-snug",
          "transition-[transform,color,font-weight,opacity] duration-[200ms] ease-out",
          "group-hover:text-primary group-hover:-translate-y-[3px] group-hover:opacity-100",
          "opacity-95"
        )}>
          {title}
        </p>

        {/* Metadata row */}
        <div className={cn(
          "flex items-center gap-1.5 mt-1.5 flex-wrap",
          "transition-[opacity,transform] duration-[200ms] ease-out",
          "opacity-85 group-hover:opacity-100 group-hover:-translate-y-[2px]",
          "translate-y-0"
        )}>
          <span className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
            isSeries
              ? "bg-purple-500/20 text-purple-400"
              : "bg-primary/20 text-primary"
          )}>
            {mediaLabel}
          </span>
          {releaseYear && releaseYear > 0 && (
            <span className="text-xs text-muted-foreground">{releaseYear}</span>
          )}
        </div>

        {/* Genres (optional, shown when provided) */}
        {genres && genres.length > 0 && (
          <p className={cn(
            "text-[11px] text-muted-foreground mt-1 line-clamp-1",
            "transition-[opacity,transform] duration-[200ms] ease-out",
            "opacity-85 group-hover:opacity-100 group-hover:-translate-y-[2px]"
          )}>
            {genres.slice(0, 3).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
