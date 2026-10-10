import { MediaItem } from "@/types/media";
import { getServerEnv } from "./env";
import { getAllBundledMedia } from "./baserow";

const tmdbCache = new Map<string, { data: MediaItem; expiry: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

const FALLBACK_POSTER = "https://image.tmdb.org/t/p/w500/wwemzKWzjKYJFfCeiB57q3r4Bcm.png";
const FALLBACK_BACKDROP = "https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg";

/**
 * Resolve a TMDB image path to a full CDN URL.
 * - Returns fallback if path is falsy.
 * - Returns as-is if path is already an absolute URL.
 * - Constructs base/size/path for relative TMDB paths.
 */
export function resolveTmdbImageUrl(
  path: string | null | undefined,
  size: string,
  fallback: string
): string {
  if (!path) return fallback;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = "https://image.tmdb.org/t/p";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}/${size}${cleanPath}`;
}

export async function fetchTmdbMedia(id: string, type: "movie" | "tv" = "movie"): Promise<MediaItem | null> {
  const config = getServerEnv();

  // Check in-memory catalog first
  const bundled = getAllBundledMedia().find((m) => m.id === id || m.tmdbId === id);
  if (bundled && !config.tmdb.isConfigured) {
    return bundled;
  }

  // Check TMDB cache
  const cached = tmdbCache.get(id);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  if (!config.tmdb.isConfigured) {
    return bundled || null;
  }

  try {
    const rawId = id.replace(/^(movie-|tv-)/, "");
    const res = await fetch(
      `${config.tmdb.baseUrl}/${type}/${rawId}?api_key=${config.tmdb.apiKey}&append_to_response=credits,videos`,
      { signal: AbortSignal.timeout(6000) }
    );

    if (!res.ok) {
      return bundled || null;
    }

    const data = await res.json();
    const title = data.title || data.name || "Untitled";
    const releaseDate = data.release_date || data.first_air_date || "";
    const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : 2024;
    const runtime = data.runtime
      ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`
      : data.number_of_seasons
      ? `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? "s" : ""}`
      : undefined;

    const directors = (data.credits?.crew || [])
      .filter((c: any) => c.job === "Director")
      .map((c: any) => c.name);

    const topCast = (data.credits?.cast || []).slice(0, 5).map((c: any) => c.name);

    const item: MediaItem = {
      id: `${type}-${data.id}`,
      tmdbId: String(data.id),
      title,
      tagline: data.tagline || undefined,
      overview: data.overview || "",
      backdropUrl: resolveTmdbImageUrl(data.backdrop_path, "w1280", bundled?.backdropUrl || FALLBACK_BACKDROP),
      posterUrl: resolveTmdbImageUrl(data.poster_path, "w500", bundled?.posterUrl || FALLBACK_POSTER),
      releaseYear,
      releaseDate,
      rating: Number((data.vote_average || 7.5).toFixed(1)),
      voteCount: data.vote_count,
      genres: (data.genres || []).map((g: any) => g.name),
      runtime,
      mediaType: type,
      badge: "4K UHD",
      audio: "Dolby Atmos",
      directors,
      topCast,
    };

    tmdbCache.set(id, { data: item, expiry: Date.now() + CACHE_TTL_MS });
    return item;
  } catch {
    return bundled || null;
  }
}

export async function searchMedia(query: string): Promise<MediaItem[]> {
  const config = getServerEnv();
  const bundled = getAllBundledMedia().filter(
    (m) =>
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      m.genres.some((g) => g.toLowerCase().includes(query.toLowerCase())) ||
      m.overview.toLowerCase().includes(query.toLowerCase())
  );

  if (!config.tmdb.isConfigured || !query.trim()) {
    return bundled;
  }

  try {
    const res = await fetch(
      `${config.tmdb.baseUrl}/search/multi?api_key=${config.tmdb.apiKey}&query=${encodeURIComponent(
        query
      )}&include_adult=false`,
      { signal: AbortSignal.timeout(6000) }
    );

    if (!res.ok) return bundled;
    const data = await res.json();
    const results = (data.results || [])
      .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
      .slice(0, 10)
      .map((r: any) => {
        const isMovie = r.media_type === "movie";
        const title = isMovie ? r.title : r.name;
        const date = isMovie ? r.release_date : r.first_air_date;
        return {
          id: `${r.media_type}-${r.id}`,
          tmdbId: String(r.id),
          title: title || "Untitled",
          overview: r.overview || "",
          backdropUrl: resolveTmdbImageUrl(r.backdrop_path, "w1280", FALLBACK_BACKDROP),
          posterUrl: resolveTmdbImageUrl(r.poster_path, "w500", FALLBACK_POSTER),
          releaseYear: date ? new Date(date).getFullYear() : 2024,
          rating: Number((r.vote_average || 7.0).toFixed(1)),
          genres: [],
          mediaType: isMovie ? "movie" : "tv",
        } as MediaItem;
      });

    return results.length > 0 ? results : bundled;
  } catch {
    return bundled;
  }
}
