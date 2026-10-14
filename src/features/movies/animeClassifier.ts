/**
 * Centralized Anime classification logic.
 * Shared across Movies, Series, Anime, and Home pages.
 *
 * Rules:
 * - Japanese anime: Animation genre (16 / "Animation") AND
 *   (original_language === "ja" OR origin_country / production_countries includes "JP" OR explicit anime keywords).
 * - Distinguishes Japanese anime from Western animation (e.g. Disney, Pixar, DreamWorks, Arcane).
 * - Live-action Japanese films (e.g. Seven Samurai, Godzilla) are NOT anime because they lack animation genre.
 * - Anime can be a movie ("movie") or a series ("tv").
 */

export interface AnimeCandidate {
  id?: number;
  tmdb_id?: number;
  media_type?: string;
  type?: string;
  title?: string;
  name?: string;
  genre_ids?: number[];
  genres?: (string | { id?: number; name?: string })[];
  original_language?: string;
  origin_country?: string[];
  production_countries?: { iso_3166_1?: string; name?: string }[];
  keywords?: ({ id?: number; name?: string } | string)[];
  overview?: string;
  first_air_date?: string;
  release_date?: string;
}

const ANIME_KEYWORDS = new Set([
  "anime",
  "japanese animation",
  "based on manga",
  "manga",
  "anime based on manga",
  "shounen",
  "shoujo",
  "seinen",
  "josei",
  "mecha anime",
  "isekai",
]);

const ANIME_KEYWORD_IDS = new Set([
  210024, // anime
  2343,   // based on manga
  287501, // anime series
]);

/**
 * Checks if candidate has Animation genre (ID 16 or name "Animation")
 */
export function hasAnimationGenre(item: AnimeCandidate): boolean {
  if (Array.isArray(item.genre_ids) && item.genre_ids.includes(16)) {
    return true;
  }
  if (Array.isArray(item.genres)) {
    return item.genres.some((g) => {
      if (typeof g === "string") return g.toLowerCase() === "animation";
      if (typeof g === "object" && g !== null) {
        return g.id === 16 || g.name?.toLowerCase() === "animation";
      }
      return false;
    });
  }
  return false;
}

/**
 * Checks if candidate has Japanese language or Japanese production origin
 */
export function hasJapaneseOrigin(item: AnimeCandidate): boolean {
  const lang = item.original_language?.toLowerCase();
  if (lang === "ja" || lang === "japanese") return true;

  if (Array.isArray(item.origin_country)) {
    if (item.origin_country.some((c) => c?.toUpperCase() === "JP")) return true;
  }

  if (Array.isArray(item.production_countries)) {
    if (
      item.production_countries.some(
        (c) => c?.iso_3166_1?.toUpperCase() === "JP" || c?.name?.toLowerCase() === "japan"
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks for explicit anime keywords
 */
export function hasAnimeKeyword(item: AnimeCandidate): boolean {
  if (!Array.isArray(item.keywords)) return false;

  for (const k of item.keywords) {
    if (typeof k === "string") {
      if (ANIME_KEYWORDS.has(k.toLowerCase().trim())) return true;
    } else if (typeof k === "object" && k !== null) {
      if (k.id && ANIME_KEYWORD_IDS.has(k.id)) return true;
      if (k.name && ANIME_KEYWORDS.has(k.name.toLowerCase().trim())) return true;
    }
  }

  return false;
}

/**
 * Returns true if the title is classified as Anime.
 */
export function isAnime(item: AnimeCandidate & { is_anime?: boolean }): boolean {
  if (!item) return false;
  if (typeof (item as any).is_anime === "boolean") return (item as any).is_anime;

  const hasAnimation = hasAnimationGenre(item);
  const isJP = hasJapaneseOrigin(item);
  const hasAnimeKw = hasAnimeKeyword(item);

  // If explicit anime keyword and animation genre, definite anime
  if (hasAnimeKw && (hasAnimation || isJP)) return true;

  // Standard TMDB Japanese animation pattern:
  // Must be animated AND have Japanese language or origin country
  if (hasAnimation && isJP) return true;

  return false;
}

/**
 * Normalize canonical media type: "movie" vs "tv"
 */
export function getCanonicalMediaType(item: {
  media_type?: string;
  type?: string;
  first_air_date?: string;
  release_date?: string;
}): "movie" | "tv" {
  if (
    item.media_type === "tv" ||
    item.type === "tv" ||
    item.type === "series" ||
    Boolean(item.first_air_date && !item.release_date)
  ) {
    return "tv";
  }
  return "movie";
}
