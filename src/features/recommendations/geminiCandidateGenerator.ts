import { geminiJsonChat } from "@/lib/gemini";
import { logger } from "@/lib/logger";
import type { MovieRow } from "@/features/movies/movieRepository";
import type { RecommendationProfileRow } from "./recommendationProfileRepository";
import type { GeminiCandidate } from "./tmdbResolver";

/**
 * Generate movie/TV recommendation candidates using Gemini AI.
 * Returns raw candidates that must be verified through TMDB before use.
 */

interface UserTasteContext {
  username: string;
  profile: RecommendationProfileRow | null;
  ratedMovies: MovieRow[];
  allMovies: MovieRow[];
  previousRecommendations?: string[]; // titles to avoid
}

/**
 * Build a concise taste summary for the Gemini prompt.
 */
function buildTasteSummary(ctx: UserTasteContext): string {
  const parts: string[] = [];

  // Top-rated movies
  const topRated = ctx.ratedMovies
    .filter((m) => m.rating >= 8)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 15);

  if (topRated.length) {
    parts.push(
      "LOVED movies (rated 8+):\n" +
        topRated
          .map((m) => `- "${m.movie_name}" (${m.release_year}) — rated ${m.rating}/10`)
          .join("\n"),
    );
  }

  // Low-rated movies
  const lowRated = ctx.ratedMovies
    .filter((m) => m.rating > 0 && m.rating <= 4)
    .sort((a, b) => a.rating - b.rating)
    .slice(0, 8);

  if (lowRated.length) {
    parts.push(
      "DISLIKED movies (rated 4 or below):\n" +
        lowRated
          .map((m) => `- "${m.movie_name}" — rated ${m.rating}/10`)
          .join("\n"),
    );
  }

  // Genre preferences from profile
  if (ctx.profile) {
    try {
      const favGenres: Record<string, number> = JSON.parse(
        ctx.profile.favorite_genres || "{}",
      );
      const sorted = Object.entries(favGenres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      if (sorted.length) {
        parts.push(
          "Favorite genres: " + sorted.map(([g]) => g).join(", "),
        );
      }
    } catch {
      /* skip */
    }

    try {
      const dislikedGenres: Record<string, number> = JSON.parse(
        ctx.profile.disliked_genres || "{}",
      );
      const sorted = Object.entries(dislikedGenres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      if (sorted.length) {
        parts.push(
          "Genres to avoid: " + sorted.map(([g]) => g).join(", "),
        );
      }
    } catch {
      /* skip */
    }

    try {
      const favDirectors: Record<string, number> = JSON.parse(
        ctx.profile.favorite_directors || "{}",
      );
      const sorted = Object.entries(favDirectors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (sorted.length) {
        parts.push(
          "Favorite directors: " + sorted.map(([d]) => d).join(", "),
        );
      }
    } catch {
      /* skip */
    }

    try {
      const favIndustries: Record<string, number> = JSON.parse(
        ctx.profile.favorite_industries || "{}",
      );
      const sorted = Object.entries(favIndustries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      if (sorted.length) {
        parts.push(
          "Film industries enjoyed: " +
            sorted.map(([i]) => i).join(", "),
        );
      }
    } catch {
      /* skip */
    }

    try {
      const favEras: Record<string, number> = JSON.parse(
        ctx.profile.favorite_eras || "{}",
      );
      const sorted = Object.entries(favEras)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      if (sorted.length) {
        parts.push("Preferred eras: " + sorted.map(([e]) => e).join(", "));
      }
    } catch {
      /* skip */
    }
  }

  // Already in library (to exclude)
  const libraryTitles = ctx.allMovies
    .map((m) => m.movie_name)
    .slice(0, 50);
  if (libraryTitles.length) {
    parts.push(
      "Already in library (DO NOT recommend these):\n" +
        libraryTitles.map((t) => `- "${t}"`).join("\n"),
    );
  }

  // Previous recommendations to avoid
  if (ctx.previousRecommendations?.length) {
    parts.push(
      "Previously recommended (try to suggest different titles):\n" +
        ctx.previousRecommendations
          .slice(0, 30)
          .map((t) => `- "${t}"`)
          .join("\n"),
    );
  }

  return parts.join("\n\n");
}

/**
 * Generate recommendation candidates using Gemini.
 * Returns 30 candidates for TMDB resolution and filtering.
 */
export async function generateGeminiCandidates(
  ctx: UserTasteContext,
  targetCount = 30,
): Promise<GeminiCandidate[]> {
  const start = Date.now();

  const tasteSummary = buildTasteSummary(ctx);
  const hasTaste = ctx.ratedMovies.length >= 3;

  const systemPrompt = `You are a movie and TV show recommendation expert. Given a user's taste profile, suggest ${targetCount} movies and TV shows they would genuinely enjoy.

Rules:
- Suggest REAL movies and TV shows that actually exist. Do not invent titles.
- Include a mix of well-known and lesser-known titles for variety.
- Include both movies and TV series.
- Each recommendation must include the exact title, approximate release year, whether it's a "movie" or "tv" show, and a brief personal reason why this user would enjoy it based on their specific taste.
- Do NOT recommend anything already in their library.
- Prioritize personal taste fit over generic popularity.
- Include diverse genres but weight toward their preferences.
- Output ONLY a JSON array with no additional text.

Each item format:
{"title": "Movie Title", "year": 2020, "media_type": "movie", "reason": "Brief reason based on user taste"}`;

  const userPrompt = hasTaste
    ? `Based on this user's taste profile, recommend ${targetCount} movies and TV shows:\n\n${tasteSummary}`
    : `This is a new user with very few ratings. Recommend ${targetCount} diverse, critically acclaimed and popular movies and TV shows across different genres that most people enjoy. Mix classics with recent hits.\n\n${tasteSummary}`;

  try {
    const candidates = await geminiJsonChat<GeminiCandidate[]>({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: hasTaste ? 0.8 : 0.6,
      maxTokens: 4096,
      timeoutMs: 45_000,
    });

    if (!Array.isArray(candidates)) {
      throw new Error("Gemini did not return an array");
    }

    // Validate structure
    const valid = candidates.filter(
      (c) =>
        typeof c.title === "string" &&
        c.title.length > 0 &&
        typeof c.reason === "string",
    );

    logger.info({
      module: "geminiCandidateGenerator",
      action: "GENERATE_CANDIDATES",
      status: "SUCCESS",
      durationMs: Date.now() - start,
      message: `Gemini generated ${valid.length} valid candidates (${candidates.length} total)`,
    });

    return valid;
  } catch (err: any) {
    logger.error({
      module: "geminiCandidateGenerator",
      action: "GENERATE_CANDIDATES",
      status: "FAILED",
      durationMs: Date.now() - start,
      error: err,
      message: "Gemini candidate generation failed",
    });
    throw err;
  }
}
