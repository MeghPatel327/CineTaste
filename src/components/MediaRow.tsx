"use client";

import { useRef } from "react";
import { MediaItem } from "@/types/media";
import { MediaCard } from "./MediaCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MediaRowProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  onSelectItem: (item: MediaItem) => void;
  showProgress?: boolean;
}

export function MediaRow({ title, subtitle, items, onSelectItem, showProgress }: MediaRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="space-y-3.5 my-8 px-6 md:px-12">
      {/* Row Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-['Plus_Jakarta_Sans'] text-white tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-400 rounded-full inline-block shadow-[0_0_8px_#10b981]" />
            {title}
          </h2>
          {subtitle && <p className="text-xs text-zinc-400 font-['Inter'] mt-0.5">{subtitle}</p>}
        </div>

        {/* Arrow Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 rounded-lg glass-panel text-zinc-400 hover:text-white hover:border-white/20 transition-all"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 rounded-lg glass-panel text-zinc-400 hover:text-white hover:border-white/20 transition-all"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={rowRef}
        className="flex items-start gap-4 overflow-x-auto hide-scrollbar scroll-smooth py-2"
      >
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            onClick={onSelectItem}
            showProgress={showProgress}
          />
        ))}
      </div>
    </section>
  );
}
