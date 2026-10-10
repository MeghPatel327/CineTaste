"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CarouselSlide } from "@/types/media";
import { Compass, Info, ChevronLeft, ChevronRight, Star, Volume2, Sparkles, Clock } from "lucide-react";

interface HeroCarouselProps {
  items: CarouselSlide[];
  onSelectMovie: (movie: CarouselSlide) => void;
}

export function HeroCarousel({ items, onSelectMovie }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const INTERVAL_MS = 7500;
  const STEP_MS = 50;

  const activeMovie = items[currentIndex] || items[0];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setProgress(0);
  }, [items.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setProgress(0);
  }, [items.length]);

  const handleSelect = (idx: number) => {
    setCurrentIndex(idx);
    setProgress(0);
  };

  // Check for prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) {
        setIsPaused(true);
      }
    }
  }, []);

  // Auto-advance loop with progress tracking
  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (STEP_MS / INTERVAL_MS) * 100;
      });
    }, STEP_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, items.length, handleNext]);

  return (
    <section
      className="relative w-full h-[75vh] min-h-[540px] max-h-[780px] overflow-hidden select-none bg-[#08090C] border-b border-white/5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      aria-label="Featured Cinematic Spotlight"
    >
      {/* ── Background Backdrop Layers with Crossfade ── */}
      {items.map((movie, idx) => {
        const isActive = idx === currentIndex;
        return (
          <div
            key={movie.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <img
              src={movie.backdropUrl}
              alt={movie.title}
              className={`w-full h-full object-cover object-center transition-transform duration-[8000ms] ease-out ${
                isActive ? "scale-105" : "scale-100"
              }`}
            />
          </div>
        );
      })}

      {/* ── Obsidian Gradient Overlays ── */}
      <div className="absolute inset-0 z-20 hero-vignette pointer-events-none" />
      <div className="absolute inset-0 z-20 hero-bottom-fade pointer-events-none" />

      {/* ── Main Hero Content Grid ── */}
      <div className="relative z-30 h-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col justify-between py-8 md:py-12">
        {/* Top Spacer to keep clear of Header */}
        <div className="h-4" />

        {/* Content Details Block */}
        <div className="max-w-2xl space-y-4">
          {/* Category Chip & Audio Specs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
              {activeMovie.spotlightCategory}
            </span>

            {activeMovie.badge && (
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider bg-white/10 text-zinc-200 border border-white/15">
                {activeMovie.badge}
              </span>
            )}

            {activeMovie.audio && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-black/40 text-zinc-400 border border-white/5">
                <Volume2 className="w-3 h-3 text-zinc-400" />
                {activeMovie.audio}
              </span>
            )}
          </div>

          {/* Large Title Typography */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white font-['Plus_Jakarta_Sans'] leading-[1.08] drop-shadow-2xl">
            {activeMovie.title}
          </h1>

          {/* Metadata Row: Rating, Year, Runtime, Genres */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-bold">
              <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
              <span>{activeMovie.rating.toFixed(1)}</span>
              <span className="text-emerald-500/60 font-normal text-xs">TMDB</span>
            </div>

            <span className="font-medium text-zinc-300">{activeMovie.releaseYear}</span>
            <span className="text-zinc-600">•</span>
            {activeMovie.runtime && (
              <>
                <span className="flex items-center gap-1 text-zinc-400 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {activeMovie.runtime}
                </span>
                <span className="text-zinc-600">•</span>
              </>
            )}

            <div className="flex items-center gap-1.5">
              {activeMovie.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-0.5 rounded-md text-xs bg-white/5 border border-white/10 text-zinc-300"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Synopsis */}
          <p className="text-zinc-300/90 text-sm md:text-base leading-relaxed line-clamp-3 max-w-xl font-['Inter'] drop-shadow">
            {activeMovie.overview}
          </p>

          {/* Call to Actions: Discover Watch Options (NO PLAY BUTTON) + See Details */}
          <div className="flex items-center gap-3.5 pt-2">
            <button
              onClick={() => onSelectMovie(activeMovie)}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-['Plus_Jakarta_Sans'] font-bold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-black hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 transform hover:-translate-y-0.5 shadow-[0_12px_28px_-6px_rgba(16,185,129,0.4)] cursor-pointer"
            >
              <Compass className="w-4 h-4 text-black" />
              Discover Watch Options
            </button>

            <button
              onClick={() => onSelectMovie(activeMovie)}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl font-['Plus_Jakarta_Sans'] font-semibold text-sm text-white glass-pill hover:bg-white/15 transition-all duration-200 cursor-pointer"
            >
              <Info className="w-4 h-4 text-zinc-300" />
              See Details
            </button>
          </div>
        </div>

        {/* ── Bottom Strip: Navigation Controls & Compact Thumbnail Selector ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
          {/* Navigation Arrows & Progress Scrubber */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl glass-panel border border-white/10 backdrop-blur-xl shrink-0 w-fit">
            <button
              onClick={handlePrev}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Previous Spotlight"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrubber Bar */}
            <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-100 ease-linear shadow-[0_0_8px_#10b981]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <button
              onClick={handleNext}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Next Spotlight"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-[11px] text-zinc-400 font-mono ml-1">
              {currentIndex + 1}/{items.length}
            </span>
          </div>

          {/* Compact 7-8 Title Thumbnail Selector */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 max-w-full sm:max-w-md lg:max-w-xl">
            {items.map((item, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(idx)}
                  className={`relative w-12 h-16 sm:w-14 sm:h-20 rounded-xl overflow-hidden shrink-0 transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-emerald-400 scale-105 shadow-[0_0_16px_rgba(16,185,129,0.4)] opacity-100"
                      : "opacity-60 hover:opacity-100 hover:scale-100"
                  }`}
                  title={item.title}
                >
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-emerald-500/15 pointer-events-none" />
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 to-transparent p-0.5 text-[8px] font-bold text-white truncate text-center">
                    {item.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
