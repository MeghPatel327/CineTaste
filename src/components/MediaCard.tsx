"use client";

import { MediaItem } from "@/types/media";
import { Star, Sparkles, Compass } from "lucide-react";

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  showProgress?: boolean;
}

export function MediaCard({ item, onClick, showProgress }: MediaCardProps) {
  return (
    <div
      onClick={() => onClick(item)}
      className="group relative flex flex-col shrink-0 w-44 md:w-52 cursor-pointer select-none"
    >
      {/* Poster Frame with Glass Accent */}
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden glass-card border border-white/10 group-hover:border-emerald-500/40">
        <img
          src={item.posterUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600'%3E%3Crect fill='%23181a20' width='400' height='600'/%3E%3Ctext x='200' y='300' text-anchor='middle' fill='%2352525b' font-size='16' font-family='sans-serif'%3ENo Poster%3C/text%3E%3C/svg%3E";
          }}
        />

        {/* Top Badges (Rating & 4K) */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-bold text-emerald-400">
            <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
            <span>{item.rating.toFixed(1)}</span>
          </div>

          {item.badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300">
              {item.badge}
            </span>
          )}
        </div>

        {/* Hover Overlay with Discover Watch Options Indicator (NO PLAY BUTTON) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/90 text-black flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] transform scale-75 group-hover:scale-100 transition-transform duration-300 mb-2">
            <Compass className="w-5 h-5 text-black" />
          </div>
          <span className="text-[11px] font-bold text-emerald-300 font-['Plus_Jakarta_Sans']">
            Watch Options
          </span>
        </div>

        {/* Watch Progress Bar (for Continue Watching) */}
        {showProgress && item.watchProgress !== undefined && (
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/60 backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-r-full shadow-[0_0_8px_#10b981]"
              style={{ width: `${item.watchProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Meta Labels Below Poster */}
      <div className="mt-2.5 space-y-1">
        <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-zinc-100 group-hover:text-emerald-300 transition-colors truncate">
          {item.title}
        </h3>

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>{item.releaseYear}</span>
          <span>{item.genres[0]}</span>
        </div>

        {item.recommendationReason && (
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium truncate pt-0.5">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.recommendationReason}</span>
          </div>
        )}
      </div>
    </div>
  );
}
