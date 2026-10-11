import { useRef, useState, useEffect, useCallback, useId } from "react";
import type { CSSProperties } from "react";
import { MovieCard } from "./MovieCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  accentBorder?: boolean;
  entranceIndex?: number;
  onSelect: (id: number, type: "movie" | "series") => void;
}

const PRELOAD_BUFFER = 12;
const CARD_SCROLL_STEP = 200;

export function HorizontalRow({
  title,
  subtitle,
  items,
  showScore = false,
  accentBorder = false,
  entranceIndex,
  onSelect,
}: HorizontalRowProps) {
  const rowId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visibleUntil, setVisibleUntil] = useState(PRELOAD_BUFFER);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // ── Arrow key navigation ─────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (e.key === "ArrowRight") { e.preventDefault(); el.scrollLeft += CARD_SCROLL_STEP; }
    else if (e.key === "ArrowLeft") { e.preventDefault(); el.scrollLeft -= CARD_SCROLL_STEP; }
  }, []);

  // ── Click navigation ─────────────────────────────────────────────────
  const scrollRow = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el || el.children.length === 0) return;
    
    // The cards are flex items with gap-4 (16px)
    const cardEl = el.children[0] as HTMLElement;
    if (!cardEl) return;
    
    const cardWidth = cardEl.offsetWidth + 16; // width + gap
    const visibleCards = Math.floor(el.clientWidth / cardWidth);
    const cardsToScroll = Math.max(1, visibleCards - 1);
    const scrollAmount = cardsToScroll * cardWidth;

    el.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth"
    });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 10);
    // tolerance of 10px for rounding
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  // ── Smart preloading ─────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting)
          setVisibleUntil(prev => Math.min(prev + PRELOAD_BUFFER, items.length));
      },
      { root: scrollRef.current, rootMargin: "0px 300px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <section
      aria-label={title}
      className={`ct-stagger-item${accentBorder ? " ct-accent-border" : ""}`}
      style={entranceIndex === undefined ? undefined : ({ "--ct-stagger-delay": `${entranceIndex * 55}ms` } as CSSProperties)}
    >
      <div className="mb-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      <div className="relative group">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scrollRow("left")}
            className="absolute -left-9 top-[45%] -translate-y-1/2 z-10 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 text-muted-foreground hover:text-primary drop-shadow-md hover:drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)] hover:scale-110 active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-10 h-10" strokeWidth={1.5} />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scrollRow("right")}
            className="absolute -right-9 top-[45%] -translate-y-1/2 z-10 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 text-muted-foreground hover:text-primary drop-shadow-md hover:drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)] hover:scale-110 active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-10 h-10" strokeWidth={1.5} />
          </button>
        )}

        <div
          ref={scrollRef}
          role="list"
          aria-label={`${title} scroll list`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          // py-4 gives lifted cards room to breathe vertically without being clipped
          // overflow-y-visible would fight overflow-x-auto, so we use padding instead
          className="flex gap-4 overflow-x-auto py-4 -my-4 snap-x snap-mandatory hide-scrollbar focus:outline-none"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
        {items.map((item, index) => {
          const id = item.movieId ?? item.id ?? 0;
          const posterUrl =
            item.poster_url ||
            (item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null);
          const isVisible = index < visibleUntil;

          return (
            <div
              key={`${rowId}-${id}-${index}`}
              role="listitem"
              className="ct-stagger-item snap-start shrink-0 ct-card-lift-wrapper"
              style={{ "--ct-stagger-delay": `${Math.min(index, 12) * 45}ms` } as CSSProperties}
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
                  genres={item.genres}
                  onClick={onSelect}
                />
              ) : (
                <div className="w-28 md:w-36 shrink-0" aria-hidden="true">
                  <div className="w-full aspect-[2/3] rounded-xl ct-shimmer" />
                  <div className="h-3 w-3/4 rounded ct-shimmer mt-2" />
                </div>
              )}
            </div>
          );
        })}

        <div ref={sentinelRef} className="shrink-0 w-px h-px self-center" aria-hidden="true" />
      </div>
      </div>
    </section>
  );
}
