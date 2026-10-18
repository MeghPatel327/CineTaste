import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isAnime, getCanonicalMediaType } from "./animeClassifier";
import { geminiJsonChat } from "@/lib/gemini";
import {
  resolveGeminiCandidates,
  type GeminiCandidate,
  type ResolvedCandidate,
} from "@/features/recommendations/tmdbResolver";
import type { BrowseItem, BrowseCategory } from "./browseService";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

export interface UnifiedSearchResultItem extends BrowseItem {
  destinationCategory: BrowseCategory;
  fallbackMatch?: boolean;
}

export interface UnifiedSearchResponse {
  results: UnifiedSearchResultItem[];
  fallbackUsed: boolean;
  query: string;
}

/**
 * Direct TMDB Search: Queries TMDB multi-search or category-specific search.
 * Bypasses Gemini completely.
 */
export async function directTmdbSearch(
  query: string,
  category?: "all" | BrowseCategory
): Promise<UnifiedSearchResultItem[]> {
  const q = query.trim();
  if (!q || !env.TMDB_API_KEY) return [];

  const endpoints: string[] = [];
  if (category === "movies") {
    endpoints.push(
      `${TMDB_BASE_URL}/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`
    );
  } else if (category === "series") {
    endpoints.push(
      `${TMDB_BASE_URL}/search/tv?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`
    );
  } else {
    // Multi search covers movies, tv, and anime
    endpoints.push(
      `${TMDB_BASE_URL}/search/multi?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`
    );
  }

  const results: UnifiedSearchResultItem[] = [];
  const seenIds = new Set<number>();

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep);
      if (!res.ok) continue;
      const data = await res.json();

      for (const r of data?.results || []) {
        if (!r?.id || seenIds.has(r.id)) continue;

        const mediaType = getCanonicalMediaType({
          media_type: r.media_type,
          first_air_date: r.first_air_date,
          release_date: r.release_date,
        });

        // Determine Anime classification
        const isAnimeTitle = isAnime({
          id: r.id,
          media_type: mediaType,
          title: r.title || r.name,
          genre_ids: r.genre_ids,
          original_language: r.original_language,
          origin_country: r.origin_country,
          overview: r.overview,
        });

        let destinationCategory: BrowseCategory = "movies";
        if (isAnimeTitle) {
          destinationCategory = "anime";
        } else if (mediaType === "tv") {
          destinationCategory = "series";
        } else {
          destinationCategory = "movies";
        }

        // Apply category filter if browsing on a specific page
        if (category && category !== "all" && destinationCategory !== category) {
          continue;
        }

        seenIds.add(r.id);

        const releaseDate = r.release_date || r.first_air_date || "";
        const releaseYear = parseInt(releaseDate.split("-")[0], 10) || undefined;
        const genres = (r.genre_ids || [])
          .map((id: number) => TMDB_GENRES[id])
          .filter(Boolean);

        const voteAvg = r.vote_average ? parseFloat(Number(r.vote_average).toFixed(1)) : undefined;
        const score = voteAvg ? Math.round(Math.min(96, Math.max(65, voteAvg * 10 + 10))) : 75;

        results.push({
          id: r.id,
          title: r.title || r.name || "Untitled",
          poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
          backdrop_url: r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : null,
          media_type: mediaType,
          release_year: releaseYear,
          vote_average: voteAvg,
          score,
          genres,
          overview: r.overview || "",
          is_anime: isAnimeTitle,
          destinationCategory,
          reasons: [
            isAnimeTitle
              ? "Anime title from TMDB"
              : mediaType === "tv"
              ? "TV Series match from TMDB"
              : "Movie match from TMDB",
          ],
        });
      }
    } catch (err: any) {
      logger.warn({
        module: "searchService",
        action: "DIRECT_SEARCH_FAILED",
        endpoint: ep,
        error: err?.message,
      });
    }
  }

  return results;
}

/**
 * Intelligent Gemini Fallback: Discovers relevant real titles when direct TMDB produces no results.
 * Resolves each discovered candidate against TMDB to guarantee genuine TMDB canonical identity.
 */
export async function geminiSearchFallback(
  query: string,
  category?: "all" | BrowseCategory
): Promise<UnifiedSearchResultItem[]> {
  const q = query.trim();
  if (!q) return [];

  logger.info({
    module: "searchService",
    action: "GEMINI_FALLBACK",
    status: "STARTED",
    query: q,
    category,
  });

  const categoryInstruction =
    category === "movies"
      ? "Focus strictly on movies (exclude series and anime)."
      : category === "series"
      ? "Focus strictly on live-action TV series (exclude anime and movies)."
      : category === "anime"
      ? "Focus strictly on Japanese anime (series or animated movies)."
      : "You may include movies, TV series, or anime as appropriate.";

  const prompt = `The user searched for: "${q}".
Direct database title search found no exact match. The user's query could be:
- A conceptual or thematic description (e.g. "time loop mystery with trains")
- A plot synopsis or memorable character/scene
- A slightly misspelled or alternative title
- A niche or foreign-language release

Suggest 6 to 10 real, acclaimed, existing titles that best satisfy this search intent.
${categoryInstruction}

Return a JSON array of objects with these exact keys:
[
  {
    "title": "Exact Official Title",
    "year": 2020,
    "media_type": "movie" | "tv",
    "categoryHint": "movies" | "series" | "anime",
    "reason": "Why this matches the user query '${q}'"
  }
]
Output ONLY raw JSON with no markdown formatting.`;

  try {
    const candidates = await geminiJsonChat<GeminiCandidate[]>({
      messages: [
        {
          role: "system",
          content: "You are an expert film and television librarian who identifies movies, series, and anime from conceptual queries, plot descriptions, and partial titles. Always provide accurate real-world titles with release years.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
      timeoutMs: 12_000,
    });

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return [];
    }

    // Resolve candidates against TMDB to guarantee real metadata & canonical IDs
    const resolved: ResolvedCandidate[] = await resolveGeminiCandidates(candidates, {
      concurrency: 4,
    });

    const results: UnifiedSearchResultItem[] = [];
    const seenIds = new Set<number>();

    for (const r of resolved) {
      if (!r?.tmdb_id || seenIds.has(r.tmdb_id)) continue;

      let destinationCategory: BrowseCategory = "movies";
      if (r.is_anime) {
        destinationCategory = "anime";
      } else if (r.media_type === "tv") {
        destinationCategory = "series";
      } else {
        destinationCategory = "movies";
      }

      if (category && category !== "all" && destinationCategory !== category) {
        continue;
      }

      seenIds.add(r.tmdb_id);

      results.push({
        id: r.tmdb_id,
        title: r.title,
        poster_url: r.poster_url,
        backdrop_url: r.backdrop_url,
        media_type: r.media_type,
        release_year: r.release_year > 0 ? r.release_year : undefined,
        vote_average: r.vote_average > 0 ? r.vote_average : undefined,
        score: Math.round(Math.min(95, Math.max(70, r.vote_average * 10))),
        genres: r.genres,
        overview: r.overview,
        is_anime: r.is_anime,
        destinationCategory,
        fallbackMatch: true,
        reasons: [r.gemini_reason || `Discovered as alternative for "${q}"`],
      });
    }

    logger.info({
      module: "searchService",
      action: "GEMINI_FALLBACK",
      status: "SUCCESS",
      query: q,
      resolvedCount: results.length,
    });

    return results;
  } catch (err: any) {
    logger.warn({
      module: "searchService",
      action: "GEMINI_FALLBACK_FAILED",
      query: q,
      error: err?.message,
    });
    return [];
  }
}

/**
 * Execute unified search: queries TMDB directly first.
 * If 0 results, invokes Gemini fallback to find relevant alternatives.
 */
export async function executeUnifiedSearch(
  query: string,
  options: {
    category?: "all" | BrowseCategory;
    allowFallback?: boolean;
  } = {}
): Promise<UnifiedSearchResponse> {
  const q = query.trim();
  const category = options.category || "all";
  const allowFallback = options.allowFallback !== false;

  if (!q) {
    return { results: [], fallbackUsed: false, query: "" };
  }

  // 1. Direct TMDB search (instant, no Gemini)
  const directResults = await directTmdbSearch(q, category);
  if (directResults.length > 0) {
    return {
      results: directResults,
      fallbackUsed: false,
      query: q,
    };
  }

  // 2. Intelligent Gemini Fallback if no direct TMDB results
  if (allowFallback) {
    const fallbackResults = await geminiSearchFallback(q, category);
    return {
      results: fallbackResults,
      fallbackUsed: fallbackResults.length > 0,
      query: q,
    };
  }

  return {
    results: [],
    fallbackUsed: false,
    query: q,
  };
}
