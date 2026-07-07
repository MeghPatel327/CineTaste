"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useId,
} from "react";
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

// How many cards ahead to preload posters (intersection observer buffer)
const PRELOAD_BUFFER = 8;

/**
 * Premium horizontal browsing row.
 *
 * Features:
 * - Mouse wheel / Shift+wheel / trackpad horizontal scroll
 * - Keyboard arrow-key navigation inside the row
 * - Signature CineTaste focus effect: hovered card enlarges, row siblings dim
 * - Smart preloading: loads poster images progressively via IntersectionObserver
 * - Smooth momentum-style scrolling
 * - Modern thin scrollbar (handled via CSS)
 */
export function HorizontalRow({
  title,
  subtitle,
  items,
  showScore = false,
  onSelect,
}: HorizontalRowProps) {
  const rowId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [visibleUntil, setVisibleUntil] = useState(PRELOAD_BUFFER + 4);
  const sentinelRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  // ── Wheel scroll handler (horizontal on vertical wheel) ──────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;

    // Only intercept when the scroll axis is vertical (standard mouse wheel)
    // Trackpads send horizontal deltaX natively — let those pass through.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    e.preventDefault();
    el.scrollLeft += e.deltaY * 1.2;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Keyboard navigation ──────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = scrollRef.current;
      if (!el) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        el.scrollLeft += 192; // ~card width
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        el.scrollLeft -= 192;
      }
    },
    []
  );

  // ── Focus effect callbacks ────────────────────────────────────────────
  const handleFocusEnter = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const handleFocusLeave = useCallback(() => {
    setFocusedIndex(null);
  }, []);

  // ── Smart preloading via IntersectionObserver on a trailing sentinel ──
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleUntil((prev) => Math.min(prev + PRELOAD_BUFFER, items.length));
        }
      },
      { root: scrollRef.current, rootMargin: "0px 200px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <section aria-label={title}>
      <div className="mb-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div
        ref={scrollRef}
        role="list"
        aria-label={`${title} scroll list`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex gap-4 overflow-x-auto pb-4",
          "snap-x snap-mandatory",
          "hide-scrollbar",
          "focus:outline-none",
          // Scroll smoothness
          "scroll-smooth",
          // Cursor
          "cursor-default"
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item, index) => {
          const id = item.movieId ?? item.id ?? 0;
          const posterUrl =
            item.poster_url ||
            (item.poster_path
              ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
              : null);

          // Only render cards up to the preload buffer
          // Cards beyond the buffer get a lightweight placeholder to preserve layout
          const isVisible = index < visibleUntil;

          // Determine if this card should be dimmed:
          // dim all OTHER cards in the row when one is focused
          const isDimmed =
            focusedIndex !== null && focusedIndex !== index;

          return (
            <div
              key={`${rowId}-${id}-${index}`}
              role="listitem"
              className="snap-start shrink-0"
            >
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
                /* Lightweight off-screen placeholder to preserve row width */
                <div
                  className="w-36 md:w-44 shrink-0"
                  aria-hidden="true"
                >
                  <div className="w-full aspect-[2/3] rounded-xl bg-secondary skeleton" />
                  <div className="h-3 w-3/4 rounded bg-secondary skeleton mt-2" />
                </div>
              )}
            </div>
          );
        })}

        {/* Sentinel element for IntersectionObserver preloading */}
        <div
          ref={sentinelRef}
          className="shrink-0 w-1 h-1 self-center"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
