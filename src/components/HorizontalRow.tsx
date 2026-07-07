"use client";

import { useRef, useState, useEffect, useCallback, useId } from "react";
import { MovieCard } from "./MovieCard";
import { cn } from "@/lib/utils";

export interface RowItem {
  id?: number;
  movieId?: number;
  title: string;
  poster_url?: string | null;
  poster_path?: string | null;
  media_type?: string;
  release_year?: number;
  vote_average?: number;
  score?: number;
  genre_ids?: number[];
  genres?: string[];
}

interface HorizontalRowProps {
  title: string;
  subtitle?: string;
  items: RowItem[];
  showScore?: boolean;
  onSelect: (id: number, type: "movie" | "series") => void;
}

const PRELOAD_BUFFER = 12;
const CARD_SCROLL_STEP = 200; // px per arrow key press

export function HorizontalRow({
  title,
  subtitle,
  items,
  showScore = false,
  onSelect,
}: HorizontalRowProps) {
  // ── All hooks before any conditional return ───────────────────────────
  const rowId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [visibleUntil, setVisibleUntil] = useState(PRELOAD_BUFFER);

  // ── Wheel → horizontal scroll ────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    // Let native horizontal trackpad swipes pass through
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    // Direct, immediate scroll — no smooth behavior on the container
    el.scrollLeft += e.deltaY * 1.3;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Arrow key navigation ─────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (e.key === "ArrowRight") { e.preventDefault(); el.scrollLeft += CARD_SCROLL_STEP; }
    else if (e.key === "ArrowLeft") { e.preventDefault(); el.scrollLeft -= CARD_SCROLL_STEP; }
  }, []);

  // ── Signature focus effect ───────────────────────────────────────────
  const handleFocusEnter = useCallback((index: number) => setFocusedIndex(index), []);
  const handleFocusLeave = useCallback(() => setFocusedIndex(null), []);

  // ── Smart preloading via IntersectionObserver ────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleUntil(prev => Math.min(prev + PRELOAD_BUFFER, items.length));
        }
      },
      { root: scrollRef.current, rootMargin: "0px 300px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length]);

  // ── Guard after all hooks ────────────────────────────────────────────
  if (items.length === 0) return null;

  return (
    <section aria-label={title}>
      <div className="mb-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      <div
        ref={scrollRef}
        role="list"
        aria-label={`${title} scroll list`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        // NO scroll-smooth here — wheel handler needs immediate response
        className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory hide-scrollbar focus:outline-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item, index) => {
          const id = item.movieId ?? item.id ?? 0;
          const posterUrl =
            item.poster_url ||
            (item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null);
          const isVisible = index < visibleUntil;
          const isDimmed = focusedIndex !== null && focusedIndex !== index;

          return (
            <div key={`${rowId}-${id}-${index}`} role="listitem" className="snap-start shrink-0">
              {isVisible ? (
                <MovieCard
                  id={id}
                  title={item.title}
                  posterUrl={posterUrl}
                  mediaType={item.media_type}
                  releaseYear={item.release_year}
                  voteAverage={item.vote_average}
                  score={item.score}
                  showScore={showScore}
                  dimmed={isDimmed}
                  genres={item.genres}
                  onClick={onSelect}
                  onFocusEnter={() => handleFocusEnter(index)}
                  onFocusLeave={handleFocusLeave}
                />
              ) : (
                // Off-screen placeholder — preserves scroll width without rendering real cards
                <div className="w-36 md:w-44 shrink-0" aria-hidden="true">
                  <div className="w-full aspect-[2/3] rounded-xl bg-secondary/50" />
                  <div className="h-3 w-3/4 rounded bg-secondary/50 mt-2" />
                </div>
              )}
            </div>
          );
        })}

        {/* Preload sentinel — sits at the end of rendered cards */}
        <div ref={sentinelRef} className="shrink-0 w-px h-px self-center" aria-hidden="true" />
      </div>
    </section>
  );
}
