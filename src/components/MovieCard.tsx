"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Color extraction ─────────────────────────────────────────────────────────
// Cached per posterUrl — computed once, never recomputed
const shadowColorCache = new Map<string, string>();

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  return [Math.round(hue(h+1/3)*255), Math.round(hue(h)*255), Math.round(hue(h-1/3)*255)];
}

function extractDominantColor(img: HTMLImageElement): string | null {
  try {
    const SIZE = 32;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE; canvas.height = SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const pixels = ctx.getImageData(0, 0, SIZE, SIZE).data;

    // Bucket pixels by coarse color, score by saturation
    const buckets = new Map<string, { n: number; r: number; g: number; b: number; score: number }>();
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i+3] < 180) continue;
      const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
      const { s, l } = rgbToHsl(r, g, b);
      // Skip near-black, near-white, and near-gray
      if (l < 0.08 || l > 0.90 || s < 0.10) continue;
      const key = `${r>>4}-${g>>4}-${b>>4}`;
      const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, score: 0 };
      cur.n++; cur.r += r; cur.g += g; cur.b += b;
      cur.score += 1 + s * 0.5;
      buckets.set(key, cur);
    }

    let best: { n: number; r: number; g: number; b: number; score: number } | null = null;
    for (const b of buckets.values()) {
      if (!best || b.score > best.score) best = b;
    }
    if (!best || best.n === 0) return null;

    // Tone the color: keep hue, reduce saturation, normalize lightness
    const { h, s, l } = rgbToHsl(best.r/best.n, best.g/best.n, best.b/best.n);
    const [r2, g2, b2] = hslToRgb(h, Math.min(s * 0.55, 0.50), Math.min(Math.max(l, 0.30), 0.55));
    return `${r2} ${g2} ${b2}`;
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MovieCardProps {
  id: number;
  title: string;
  posterUrl?: string | null;
  mediaType?: "movie" | "tv" | string;
  releaseYear?: number;
  voteAverage?: number;
  score?: number;
  showScore?: boolean;
  genres?: string[];
  onClick: (id: number, type: "movie" | "series") => void;
  // Legacy — accepted, ignored
  dimmed?: boolean;
  onFocusEnter?: () => void;
  onFocusLeave?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MovieCard({
  id,
  title,
  posterUrl,
  mediaType = "movie",
  releaseYear,
  voteAverage,
  score,
  showScore = false,
  genres,
  onClick,
  className,
  style,
}: MovieCardProps) {
  const [imgPhase, setImgPhase] = useState<"loading" | "revealed" | "loaded">("loading");
  const [clicking, setClicking] = useState(false);
  // CSS custom property for ambient shadow color (r g b triplet)
  const [shadowRgb, setShadowRgb] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isSeries = mediaType === "tv";

  const handleClick = useCallback(() => {
    if (clicking) return;
    setClicking(true);
    setTimeout(() => setClicking(false), 140);
    onClick(id, isSeries ? "series" : "movie");
  }, [id, isSeries, clicking, onClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); }
  }, [handleClick]);

  const handleImageLoad = useCallback(() => {
    setImgPhase("revealed");
    setTimeout(() => setImgPhase("loaded"), 80);

    // Extract dominant color once per poster URL
    if (!posterUrl || !imgRef.current) return;
    if (shadowColorCache.has(posterUrl)) {
      setShadowRgb(shadowColorCache.get(posterUrl)!);
      return;
    }
    const color = extractDominantColor(imgRef.current);
    const value = color ?? "";
    shadowColorCache.set(posterUrl, value);
    if (color) setShadowRgb(color);
  }, [posterUrl]);

  // If poster was already cached (component remounted, same URL)
  useEffect(() => {
    if (posterUrl && shadowColorCache.has(posterUrl)) {
      const cached = shadowColorCache.get(posterUrl)!;
      if (cached) setShadowRgb(cached);
    }
  }, [posterUrl]);

  const cardStyle: CSSProperties = {
    ...style,
    ...(shadowRgb ? { "--ct-ambient-rgb": shadowRgb } as any : {}),
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title}${releaseYear ? `, ${releaseYear}` : ""} · ${isSeries ? "Series" : "Movie"}`}
      data-clicking={clicking ? "true" : undefined}
      data-image-ready={imgPhase === "loaded" ? "true" : undefined}
      data-has-ambient={shadowRgb ? "true" : undefined}
      className={cn(
        "ct-movie-card group relative w-36 md:w-44 shrink-0 rounded-xl cursor-pointer select-none outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      style={cardStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* ── Poster ── */}
      <div className="relative rounded-xl aspect-[2/3] overflow-hidden">

        {/* Shimmer */}
        <div className={cn(
          "absolute inset-0 rounded-xl transition-opacity duration-300",
          imgPhase === "loading" ? "ct-shimmer" : "opacity-0 pointer-events-none"
        )} />

        {/* Poster image */}
        {posterUrl && (
          <img
            ref={imgRef}
            src={posterUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            crossOrigin="anonymous"
            className={cn(
              "ct-poster-img absolute inset-0 w-full h-full object-cover rounded-xl",
              imgPhase === "loading" ? "opacity-0" : "opacity-100",
              imgPhase !== "loaded" && "ct-poster-img-blurred"
            )}
            onLoad={handleImageLoad}
            onError={() => setImgPhase("loaded")}
          />
        )}

        {/* No-poster fallback */}
        {!posterUrl && (
          <div className="absolute inset-0 bg-secondary rounded-xl flex items-center justify-center text-xs text-muted-foreground">
            No Poster
          </div>
        )}

        {/* Blur-in overlay */}
        {posterUrl && (
          <div className={cn(
            "absolute inset-0 rounded-xl pointer-events-none backdrop-blur-sm bg-black/10 transition-opacity duration-300",
            imgPhase === "loaded" ? "opacity-0" : "opacity-100"
          )} />
        )}

        {/* Bottom gradient */}
        <div className="ct-poster-gradient absolute inset-x-0 bottom-0 h-[55%] rounded-b-xl pointer-events-none bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

        {/* Score badge */}
        {showScore && score !== undefined && (
          <div className="match-badge ct-badge absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white">
            {score}%
          </div>
        )}

        {/* TMDB rating badge */}
        {!showScore && voteAverage && voteAverage > 0 && (
          <div className="ct-badge absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            {voteAverage.toFixed(1)}
          </div>
        )}
      </div>

      {/* ── Text ── */}
      <div className="pt-2 pb-1 px-0.5">
        <p className="ct-card-title font-semibold text-sm line-clamp-2 leading-snug opacity-95">{title}</p>
        <div className="ct-card-meta flex items-center gap-1.5 mt-1.5 flex-wrap opacity-85">
          <span className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
            isSeries ? "bg-purple-500/20 text-purple-400" : "bg-primary/20 text-primary"
          )}>
            {isSeries ? "Series" : "Movie"}
          </span>
          {releaseYear && releaseYear > 0 && (
            <span className="text-xs text-muted-foreground">{releaseYear}</span>
          )}
        </div>
        {genres && genres.length > 0 && (
          <p className="ct-card-meta text-[11px] text-muted-foreground mt-1 line-clamp-1 opacity-85">
            {genres.slice(0, 3).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
