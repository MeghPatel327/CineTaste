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
          .map((m) => {
            const review = m.personal_review?.trim();
            return `- "${m.movie_name}" (${m.release_year}) — rated ${m.rating}/10` +
              (review ? `\n  Review: "${review}"` : "");
          })
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
          .map((m) => {
            const review = m.personal_review?.trim();
            return `- "${m.movie_name}" — rated ${m.rating}/10` +
              (review ? `\n  Review: "${review}"` : "");
          })
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

export interface GeminiGenerationOptions {
  category?: "movies" | "series" | "anime";
  targetCount?: number;
  filterPrompt?: string;
}

/**
 * Generate recommendation candidates using Gemini.
 * Supports category-specific generation (Movies, Series, Anime)
 * and filter-targeted candidate discovery for low-result filter expansion.
 */
export async function generateGeminiCandidates(
  ctx: UserTasteContext,
  optionsOrCount?: number | GeminiGenerationOptions,
): Promise<GeminiCandidate[]> {
  const start = Date.now();

  const options: GeminiGenerationOptions =
    typeof optionsOrCount === "number"
      ? { targetCount: optionsOrCount }
      : optionsOrCount || {};

  const targetCount = options.targetCount ?? 80;
  const category = options.category;
  const filterPrompt = options.filterPrompt;

  const tasteSummary = buildTasteSummary(ctx);
  const hasTaste = ctx.ratedMovies.length >= 3;

  let categoryDescription = "movies and TV shows";
  let mediaTypeInstruction = `Each recommendation must have media_type: "movie" or "tv".`;
  if (category === "movies") {
    categoryDescription = "live-action and Western cinema feature films (DO NOT include Japanese anime or TV series)";
    mediaTypeInstruction = `All recommendations MUST be media_type: "movie". Do NOT recommend Japanese anime.`;
  } else if (category === "series") {
    categoryDescription = "live-action and Western episodic TV series (DO NOT include Japanese anime or movies)";
    mediaTypeInstruction = `All recommendations MUST be media_type: "tv". Do NOT recommend Japanese anime or standalone movies.`;
  } else if (category === "anime") {
    categoryDescription = "Japanese anime productions (including both acclaimed anime TV series and theatrical anime movies)";
    mediaTypeInstruction = `All recommendations MUST be Japanese anime. Set media_type to "tv" for anime series or "movie" for anime films.`;
  }

  const systemPrompt = `You are a cinematic recommendation specialist. Suggest ${targetCount} ${categoryDescription} that the user will genuinely love.

Rules:
- Suggest REAL, verified titles that actually exist in the TMDB database. Do NOT hallucinate or invent titles.
- ${mediaTypeInstruction}
- Mix well-known acclaimed masterpieces with lesser-known hidden gems.
- For each recommendation, provide:
  * "title": Exact official title (English or commonly known international title). For anime, common English or Romaji title.
  * "year": Release year as an integer (e.g. 2019).
  * "media_type": "movie" or "tv".
  * "reason": Concise, personalized explanation of why this matches the user's taste.
- Do NOT suggest titles already in their library or previous recommendations.
${filterPrompt ? `- STRICT FILTER REQUIREMENT: Every single suggestion MUST strictly match these user filters: ${filterPrompt}` : ""}
- Output ONLY a JSON array of objects. No markdown explanations or preamble.`;

  const userPrompt = filterPrompt
    ? `Find titles specifically matching these filters: "${filterPrompt}". User taste context:\n\n${tasteSummary}`
    : hasTaste
    ? `Based on this user's taste profile, recommend ${targetCount} ${categoryDescription}:\n\n${tasteSummary}`
    : `This user is exploring ${categoryDescription}. Recommend ${targetCount} top-rated, critically acclaimed and beloved titles across diverse genres:\n\n${tasteSummary}`;

  try {
    const candidates = await geminiJsonChat<GeminiCandidate[]>({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: hasTaste ? 0.75 : 0.6,
      maxTokens: 8192,
      timeoutMs: 50_000,
    });

    if (!Array.isArray(candidates)) {
      throw new Error("Gemini did not return an array");
    }

    // Validate structure & tag categoryHint
    const valid = candidates
      .filter(
        (c) =>
          typeof c.title === "string" &&
          c.title.trim().length > 0 &&
          typeof c.reason === "string",
      )
      .map((c) => ({
        ...c,
        title: c.title.trim(),
        categoryHint: category,
        media_type:
          category === "movies"
            ? "movie"
            : category === "series"
            ? "tv"
            : c.media_type === "tv" || c.media_type === "movie"
            ? c.media_type
            : undefined,
      }));

    logger.info({
      module: "geminiCandidateGenerator",
      action: "GENERATE_CANDIDATES",
      category: category || "all",
      status: "SUCCESS",
      durationMs: Date.now() - start,
      message: `Gemini generated ${valid.length} valid candidates for ${category || "all"}`,
    });

    return valid;
  } catch (err: any) {
    logger.error({
      module: "geminiCandidateGenerator",
      action: "GENERATE_CANDIDATES",
      category: category || "all",
      status: "FAILED",
      durationMs: Date.now() - start,
      error: err,
      message: "Gemini candidate generation failed",
    });
    throw err;
  }
}
