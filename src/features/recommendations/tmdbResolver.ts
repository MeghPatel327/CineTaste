import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * TMDB resolver for Gemini-generated candidates.
 * Verifies each candidate against TMDB search results to establish real movie identity.
 */

export interface GeminiCandidate {
  title: string;
  year?: number;
  reason: string;
  media_type?: "movie" | "tv";
}

export interface ResolvedCandidate {
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  backdrop_url: string | null;
  media_type: "movie" | "tv";
  genres: string[];
  release_year: number;
  vote_average: number;
  overview: string;
  gemini_reason: string;
}

const TMDB = "https://api.themoviedb.org/3";

const TMDB_GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10765: "Sci-Fi & Fantasy",
};

async function tmdbFetch(url: string): Promise<any> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Search TMDB for a candidate and return the best match, or null if unresolvable.
 */
async function resolveOne(
  candidate: GeminiCandidate,
): Promise<ResolvedCandidate | null> {
  const { title, year, reason } = candidate;
  const preferredType = candidate.media_type || "movie";

  // Build search query
  const query = encodeURIComponent(title);
  const yearParam = year ? `&year=${year}` : "";
  const primaryYearParam = year ? `&primary_release_year=${year}` : "";

  // Try type-specific search first, then multi search
  const searches = [
    `${TMDB}/search/${preferredType}?api_key=${env.TMDB_API_KEY}&query=${query}${preferredType === "movie" ? primaryYearParam : yearParam}`,
    `${TMDB}/search/multi?api_key=${env.TMDB_API_KEY}&query=${query}`,
  ];

  for (const searchUrl of searches) {
    const data = await tmdbFetch(searchUrl);
    if (!data?.results?.length) continue;

    // Filter to movie/tv only
    const filtered = data.results.filter(
      (r: any) =>
        (r.media_type === "movie" || r.media_type === "tv" || !r.media_type) &&
        (r.title || r.name),
    );

    if (!filtered.length) continue;

    // Find best match
    const match = findBestMatch(filtered, title, year);
    if (!match) continue;

    const mediaType: "movie" | "tv" =
      match.media_type === "tv" || match.first_air_date ? "tv" : "movie";
    const releaseDate =
      match.release_date || match.first_air_date || "";
    const releaseYear =
      parseInt(releaseDate.split("-")[0], 10) || 0;
    const genres = (match.genre_ids || [])
      .map((id: number) => TMDB_GENRE_MAP[id])
      .filter(Boolean);

    return {
      tmdb_id: match.id,
      title: match.title || match.name,
      poster_url: match.poster_path
        ? `https://image.tmdb.org/t/p/w500${match.poster_path}`
        : null,
      backdrop_url: match.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${match.backdrop_path}`
        : null,
      media_type: mediaType,
      genres,
      release_year: releaseYear,
      vote_average: match.vote_average || 0,
      overview: match.overview || "",
      gemini_reason: reason,
    };
  }

  logger.debug({
    module: "tmdbResolver",
    action: "RESOLVE_FAILED",
    status: "FAILED",
    message: `Could not resolve: "${title}" (${year || "unknown year"})`,
  });

  return null;
}

/**
 * Find the best TMDB match for a given title and year.
 */
function findBestMatch(
  results: any[],
  title: string,
  year?: number,
): any | null {
  const normalizedTitle = title.toLowerCase().trim();

  // Score each result
  const scored = results.map((r) => {
    let score = 0;
    const rTitle = (r.title || r.name || "").toLowerCase().trim();
    const rOriginal = (r.original_title || r.original_name || "")
      .toLowerCase()
      .trim();

    // Exact title match
    if (rTitle === normalizedTitle || rOriginal === normalizedTitle) {
      score += 100;
    } else if (
      rTitle.includes(normalizedTitle) ||
      normalizedTitle.includes(rTitle)
    ) {
      score += 50;
    }

    // Year match
    if (year) {
      const releaseDate = r.release_date || r.first_air_date || "";
      const rYear = parseInt(releaseDate.split("-")[0], 10);
      if (rYear === year) score += 30;
      else if (Math.abs(rYear - year) <= 1) score += 15;
    }

    // Popularity boost (minor)
    score += Math.min((r.popularity || 0) / 100, 5);

    return { result: r, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Require minimum match quality
  if (scored[0]?.score >= 50) return scored[0].result;

  return null;
}

/**
 * Resolve a batch of Gemini candidates through TMDB.
 * Uses bounded concurrency.
 */
export async function resolveGeminiCandidates(
  candidates: GeminiCandidate[],
  options?: { concurrency?: number },
): Promise<ResolvedCandidate[]> {
  const concurrency = options?.concurrency ?? 5;
  const results: ResolvedCandidate[] = [];
  const seen = new Set<number>();

  // Process in batches
  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    const resolved = await Promise.all(batch.map(resolveOne));

    for (const r of resolved) {
      if (r && !seen.has(r.tmdb_id)) {
        seen.add(r.tmdb_id);
        results.push(r);
      }
    }
  }

  logger.info({
    module: "tmdbResolver",
    action: "RESOLVE_BATCH",
    status: "SUCCESS",
    message: `Resolved ${results.length}/${candidates.length} Gemini candidates through TMDB`,
  });

  return results;
}
