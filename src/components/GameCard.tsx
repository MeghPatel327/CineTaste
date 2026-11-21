"use client";

import { useState } from "react";
import { Star, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GameItem, GameStatus } from "@/features/games/gameTypes";

interface GameCardProps {
  game: GameItem;
  onClick: (game: GameItem) => void;
  userStatus?: GameStatus;
  userRating?: number;
}

const statusBadgeStyles: Record<GameStatus, string> = {
  playing: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  on_hold: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  dropped: "bg-rose-500/20 text-rose-300 border-rose-500/40",
};

const statusLabels: Record<GameStatus, string> = {
  playing: "Playing",
  completed: "Completed",
  pending: "Backlog",
  on_hold: "On Hold",
  dropped: "Dropped",
};

export function GameCard({ game, onClick, userStatus, userRating }: GameCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const coverUrl = game.cover_url || "";
  const rating = userRating && userRating > 0 ? userRating : game.rating ? Math.round(game.rating / 10) : null;
  const isUserScore = Boolean(userRating && userRating > 0);

  // Shorten platform names for compact badges
  const displayPlatforms = (game.platforms || []).slice(0, 3).map((p) => {
    if (p.includes("PlayStation 5")) return "PS5";
    if (p.includes("PlayStation 4")) return "PS4";
    if (p.includes("Xbox Series")) return "XSX";
    if (p.includes("Xbox One")) return "XOne";
    if (p.includes("Nintendo Switch")) return "Switch";
    if (p.includes("PC") || p.includes("Windows")) return "PC";
    if (p.includes("Mac")) return "Mac";
    if (p.includes("Linux")) return "Linux";
    return p.length > 8 ? p.slice(0, 7) + "…" : p;
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(game)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(game);
        }
      }}
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer",
        "bg-[#130E24]/90 border border-purple-500/15 hover:border-purple-400/50",
        "transition-all duration-300 ease-out transform hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(168,85,247,0.22)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
      )}
    >
      {/* Aspect Ratio Poster Container (3:4 ratio for game covers) */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#0B0813]">
        {coverUrl && !imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-purple-950/20 animate-pulse" />
            )}
            <img
              src={coverUrl}
              alt={game.title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={cn(
                "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
                imgLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-purple-400/50 bg-[#16102B]">
            <Gamepad2 className="w-12 h-12 mb-2 stroke-[1.5]" />
            <span className="text-xs text-center line-clamp-2 px-2 text-purple-300/70">{game.title}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1 z-10 pointer-events-none">
          {userStatus ? (
            <span
              className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded-md border backdrop-blur-md shadow-md",
                statusBadgeStyles[userStatus] || "bg-purple-500/20 text-purple-300 border-purple-500/40"
              )}
            >
              {statusLabels[userStatus] || userStatus}
            </span>
          ) : (
            <span />
          )}

          {rating !== null && (
            <span
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold backdrop-blur-md border shadow-md",
                isUserScore
                  ? "bg-amber-500/25 text-amber-300 border-amber-500/40"
                  : "bg-black/60 text-purple-200 border-purple-500/30"
              )}
            >
              <Star className={cn("w-3 h-3 fill-current", isUserScore ? "text-amber-400" : "text-purple-400")} />
              <span>{rating}/10</span>
            </span>
          )}
        </div>

        {/* Ambient bottom gradient overlay on cover */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#130E24] via-[#130E24]/60 to-transparent pointer-events-none" />
      </div>

      {/* Content Details */}
      <div className="flex flex-col flex-1 p-3.5 justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#F5F7F6] group-hover:text-purple-300 line-clamp-1 transition-colors">
            {game.title}
          </h3>

          <div className="flex items-center gap-2 mt-1 text-[11px] text-purple-300/60">
            {game.release_year ? <span>{game.release_year}</span> : null}
            {game.genres && game.genres.length > 0 && (
              <>
                <span>•</span>
                <span className="truncate">{game.genres[0]}</span>
              </>
            )}
          </div>
        </div>

        {/* Platform Tags */}
        {displayPlatforms.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {displayPlatforms.map((plat) => (
              <span
                key={plat}
                className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-purple-950/60 border border-purple-500/20 text-purple-300/80"
              >
                {plat}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
