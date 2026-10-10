"use client";

import { useState, useEffect } from "react";
import { MediaItem, LibraryStatus } from "@/types/media";
import { MediaCard } from "../MediaCard";
import { Layers, Filter, CheckCircle2, Clock, Eye, XCircle } from "lucide-react";

interface LibraryViewProps {
  onSelectItem: (item: MediaItem) => void;
}

export function LibraryView({ onSelectItem }: LibraryViewProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/library")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setItems(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filterTabs = [
    { id: "all", label: "All Items", icon: Layers },
    { id: "watching", label: "Watching", icon: Eye },
    { id: "completed", label: "Completed", icon: CheckCircle2 },
    { id: "plan_to_watch", label: "Plan to Watch", icon: Clock },
    { id: "dropped", label: "Dropped", icon: XCircle },
  ];

  const filteredItems = items.filter((item: any) => {
    if (filter === "all") return true;
    return item.userRecord?.libraryStatus === filter;
  });

  return (
    <div className="space-y-6 px-6 md:px-12 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-white tracking-tight flex items-center gap-3">
          <span className="w-2 h-6 bg-emerald-400 rounded-full inline-block shadow-[0_0_10px_#10b981]" />
          Cinema Library
        </h1>
        <p className="text-sm text-zinc-400">
          Your personal catalog tracked in Baserow, synced with your viewing statuses and ratings.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_14px_rgba(16,185,129,0.25)]"
                  : "bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-zinc-400 text-sm animate-pulse">
          Loading library from Baserow...
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredItems.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onClick={onSelectItem}
              showProgress={item.watchProgress !== undefined}
            />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center rounded-2xl glass-panel border border-white/5 space-y-2">
          <Layers className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-300">No titles in this category</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Explore recommendations on the Home tab and set statuses to build your cinema collection.
          </p>
        </div>
      )}
    </div>
  );
}
