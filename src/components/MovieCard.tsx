"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Color extraction ─────────────────────────────────────────────────────────
// Keyed by posterUrl. Stores "r,g,b" string or "" (failed).
const colorCache = new Map<string, string>();

function extractColor(url: string): Promise<string> {
  return new Promise(resolve => {
    // Return cached result immediately
    if (colorCache.has(url)) { resolve(colorCache.get(url)!); return; }

    // Use a fresh Image with crossOrigin so canvas can read pixels.
    // TMDB image CDN (image.tmdb.org) sends Access-Control-Allow-Origin: *
    // We use a cache-busted URL only for the hidden extraction image so the
    // displayed <img> (no crossOrigin attr) keeps its normal browser cache.
    const img = new Image();
    img.crossOrigin = "anonymous";
    // Add a query param so the browser fetches a fresh CORS-enabled copy
    // without poisoning the main image cache entry
    const sep = url.includes("?") ? "&" : "?";
    img.src = url + sep + "_c=1";

    img.onload = () => {
      try {
        const SIZE = 24;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) { colorCache.set(url, ""); resolve(""); return; }

        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

        // Bucket by coarse color, score by saturation × frequency
        type Bucket = { n: number; r: number; g: number; b: number; score: number };
        const buckets = new Map<string, Bucket>();

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 180) continue;
          const r = data[i], g = data[i + 1], b = data[i + 2];

          // Convert to HSL to filter out near-black, near-white, near-grey
          const rn = r / 255, gn = g / 255, bn = b / 255;
          const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
          const l = (max + min) / 2;
          const d = max - min;
          const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);

          if (l < 0.07 || l > 0.92 || s < 0.12) continue; // skip dark/light/grey

          const key = `${r >> 3}-${g >> 3}-${b >> 3}`; // 32-level bucket
          const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, score: 0 };
          cur.n++; cur.r += r; cur.g += g; cur.b += b;
          cur.score += 1 + s * 0.6; // weight by saturation
          buckets.set(key, cur);
        }

        // Pick highest-scoring bucket
        let best: Bucket | null = null;
        for (const b of buckets.values()) {
          if (!best || b.score > best.score) best = b;
        }

        if (!best || best.n === 0) { colorCache.set(url, ""); resolve(""); return; }

        const r = Math.round(best.r / best.n);
        const g = Math.round(best.g / best.n);
        const b2 = Math.round(best.b / best.n);
        const result = `${r},${g},${b2}`;
        colorCache.set(url, result);
        resolve(result);
      } catch {
        // SecurityError if CORS fails — cache as empty so we don't retry
        colorCache.set(url, "");
        resolve("");
      }
    };

    img.onerror = () => { colorCache.set(url, ""); resolve(""); };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  dimmed?: boolean;
  onFocusEnter?: () => void;
  onFocusLeave?: () => void;
  className?: string;
  style?: CSSProperties;
}

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
  const [ambientRgb, setAmbientRgb] = useState<string>("");
  const extractedRef = useRef(false);
  const isSeries = mediaType === "tv";

  // Extract dominant color once when poster URL is available
  useEffect(() => {
    if (!posterUrl || extractedRef.current) return;
    // If already cached, set immediately
    if (colorCache.has(posterUrl)) {
      setAmbientRgb(colorCache.get(posterUrl)!);
      extractedRef.current = true;
      return;
    }
    // Delay slightly so the visible image loads first (avoids competing requests)
    const t = setTimeout(() => {
      extractedRef.current = true;
      extractColor(posterUrl).then(rgb => { if (rgb) setAmbientRgb(rgb); });
    }, 400);
    return () => clearTimeout(t);
  }, [posterUrl]);

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
  }, []);

  const cardStyle: CSSProperties = ambientRgb
    ? { ...style, "--ct-ambient-rgb": ambientRgb } as CSSProperties
    : style ?? {};

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title}${releaseYear ? `, ${releaseYear}` : ""} · ${isSeries ? "Series" : "Movie"}`}
      data-clicking={clicking ? "true" : undefined}
      data-image-ready={imgPhase === "loaded" ? "true" : undefined}
      data-ambient={ambientRgb ? "true" : undefined}
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

        {posterUrl && (
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            className={cn(
              "ct-poster-img absolute inset-0 w-full h-full object-cover rounded-xl",
              imgPhase === "loading" ? "opacity-0" : "opacity-100",
              imgPhase !== "loaded" && "ct-poster-img-blurred"
            )}
            onLoad={handleImageLoad}
            onError={() => setImgPhase("loaded")}
          />
        )}

        {!posterUrl && (
          <div className="absolute inset-0 bg-secondary rounded-xl flex items-center justify-center text-xs text-muted-foreground">
            No Poster
          </div>
        )}

        {posterUrl && (
          <div className={cn(
            "absolute inset-0 rounded-xl pointer-events-none backdrop-blur-sm bg-black/10 transition-opacity duration-300",
            imgPhase === "loaded" ? "opacity-0" : "opacity-100"
          )} />
        )}

        {/* Gradient overlay */}
        <div className="ct-poster-gradient absolute inset-x-0 bottom-0 h-[55%] rounded-b-xl pointer-events-none bg-gradient-to-t from-black/80 via-black/35 to-transparent" />



        {showScore && score !== undefined && (
          <div className="match-badge ct-badge absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white">
            {score}%
          </div>
        )}

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
