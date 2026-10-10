"use client";

import { useState, useEffect } from "react";
import { MediaItem } from "@/types/media";
import { MediaCard } from "../MediaCard";
import { Bookmark, Sparkles } from "lucide-react";

interface QueueViewProps {
  onSelectItem: (item: MediaItem) => void;
}

export function QueueView({ onSelectItem }: QueueViewProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/queue")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setItems(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 px-6 md:px-12 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-white tracking-tight flex items-center gap-3">
          <span className="w-2 h-6 bg-emerald-400 rounded-full inline-block shadow-[0_0_10px_#10b981]" />
          Private Cinema Queue
        </h1>
        <p className="text-sm text-zinc-400">
          Your bookmarked watchlist ready for tonight&apos;s viewing session. Discover verified watch links in one click.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-zinc-400 text-sm animate-pulse">
          Fetching queue from Baserow...
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onClick={onSelectItem}
            />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center rounded-2xl glass-panel border border-white/5 space-y-3">
          <Bookmark className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-300">Your queue is empty</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Browse the cinematic spotlight or AI recommendations to bookmark titles into your queue.
          </p>
        </div>
      )}
    </div>
  );
}
