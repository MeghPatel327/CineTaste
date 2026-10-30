import type { MovieRow } from "@/features/movies/movieRepository";
import type { RecommendationProfileRow } from "@/features/recommendations/recommendationProfileRepository";

export interface GenreStat {
  avg: number;
  count: number;
  highCount: number;
  lowCount: number;
  netScore: number;
  titles: string[];
}

export interface UserTasteAnalysis {
  genreStats: Record<string, GenreStat>;
  favoriteGenresMap: Record<string, number>;
  dislikedGenresMap: Record<string, number>;
  strongLikes: string[];
  singleFavorites: string[];
  strongDislikes: string[];
  mixedGenres: string[];
  highestRatedGenre: { genre: string; avgRating: number; count: number } | null;
  lowestRatedGenre: { genre: string; avgRating: number; count: number } | null;
  storytellingStyles: string[];
  preferredEras: string[];
  movieCount: number;
  seriesCount: number;
}

export interface TasteDnaResult {
  summaryParagraph: string;
  strongLikes: string[];
  strongDislikes: string[];
  storytellingStyles: string[];
  preferredEras: string[];
  favoriteGenres: { name: string; value: number }[];
  highestRatedGenre: { genre: string; avgRating: number; count: number } | null;
  lowestRatedGenre: { genre: string; avgRating: number; count: number } | null;
  genreAverages: Record<string, { avg: number; count: number; highCount: number; lowCount: number; netScore: number }>;
}

export const RATING_WEIGHTS: Record<number, number> = {
  10: 2.0,
  9: 1.5,
  8: 1.0,
  7: 0.5,
  6: 0.0,
  5: -0.25,
  4: -0.5,
  3: -1.0,
  2: -1.5,
  1: -2.0,
};

export function parseGenresList(genresStr: string | null | undefined): string[] {
  if (!genresStr) return [];
  const trimmed = genresStr.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {
    // Comma-separated fallback
  }
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Core unified preference-classification logic shared by Taste DNA,
 * profileGenerator, recommendationEngine, and CineTaste chatbot.
 * Guarantees strict mutual exclusivity: Strong Affinities ∩ Dislikes = ∅.
 */
export function analyzeUserTaste(movies: MovieRow[]): UserTasteAnalysis {
  const completed = movies.filter((m) => m.status === "completed" && m.rating > 0);
  const dropped = movies.filter((m) => m.status === "dropped");

  const rawGenreStats: Record<
    string,
    { sum: number; count: number; highCount: number; lowCount: number; netScore: number; titles: string[] }
  > = {};

  const registerGenreObservation = (
    genre: string,
    rating: number,
    isDropped: boolean,
    title: string
  ) => {
    if (!genre) return;
    if (!rawGenreStats[genre]) {
      rawGenreStats[genre] = { sum: 0, count: 0, highCount: 0, lowCount: 0, netScore: 0, titles: [] };
    }

    const stat = rawGenreStats[genre];
    stat.count += 1;
    stat.titles.push(title);

    if (isDropped) {
      // Dropped titles represent decisive negative tolerance
      const effectiveRating = rating > 0 ? rating : 2;
      stat.sum += effectiveRating;
      stat.lowCount += 1;
      stat.netScore += -2.0;
    } else {
      stat.sum += rating;
      const weight = RATING_WEIGHTS[rating] ?? 0;
      stat.netScore += weight;

      if (rating >= 8) {
        stat.highCount += 1;
      } else if (rating <= 4) {
        stat.lowCount += 1;
      }
    }
  };

  completed.forEach((m) => {
    const genres = parseGenresList(m.genres);
    genres.forEach((g) => registerGenreObservation(g, m.rating, false, m.movie_name));
  });

  dropped.forEach((m) => {
    const genres = parseGenresList(m.genres);
    genres.forEach((g) => registerGenreObservation(g, m.rating, true, m.movie_name));
  });

  const genreStats: Record<string, GenreStat> = {};
  Object.entries(rawGenreStats).forEach(([g, data]) => {
    genreStats[g] = {
      avg: parseFloat((data.sum / data.count).toFixed(1)),
      count: data.count,
      highCount: data.highCount,
      lowCount: data.lowCount,
      netScore: parseFloat(data.netScore.toFixed(2)),
      titles: data.titles,
    };
  });

  // Strict, Evidence-Backed Classification
  const candidateLikes: string[] = [];
  const singleFavorites: string[] = [];
  const candidateDislikes: string[] = [];
  const mixedGenres: string[] = [];

  Object.entries(genreStats).forEach(([genre, stat]) => {
    // 1. Single standout title with exceptional rating (isolated emerging signal)
    if (stat.count === 1) {
      if (stat.avg >= 9 && stat.netScore >= 1.5 && stat.lowCount === 0) {
        singleFavorites.push(genre);
      } else if (stat.avg <= 3 || stat.netScore <= -1.5) {
        candidateDislikes.push(genre);
      } else {
        mixedGenres.push(genre);
      }
      return;
    }

    // 2. Multi-title evidence evaluation (count >= 2)
    const isPredominantlyPositive =
      stat.avg >= 7.0 &&
      stat.netScore > 0 &&
      stat.highCount > stat.lowCount &&
      (stat.lowCount / stat.count <= 0.35 || stat.highCount >= 2.5 * stat.lowCount);

    const isPredominantlyNegative =
      stat.avg <= 5.0 &&
      stat.netScore < 0 &&
      stat.lowCount > stat.highCount &&
      (stat.highCount === 0 || stat.lowCount >= 2 * stat.highCount);

    if (isPredominantlyPositive) {
      candidateLikes.push(genre);
    } else if (isPredominantlyNegative) {
      candidateDislikes.push(genre);
    } else {
      // Conflicting signals or neutral zone (e.g. 3 high ratings and 3 low ratings, or avg ~6.0)
      mixedGenres.push(genre);
    }
  });

  // Enforce absolute mutual exclusivity
  const strongLikes = candidateLikes.filter((g) => !candidateDislikes.includes(g));
  const strongDislikes = candidateDislikes.filter((g) => !candidateLikes.includes(g) && !singleFavorites.includes(g));

  // Build sanitized, mutually exclusive numeric maps for recommendation engine & Baserow
  const favoriteGenresMap: Record<string, number> = {};
  const dislikedGenresMap: Record<string, number> = {};

  strongLikes.forEach((g) => {
    const stat = genreStats[g];
    if (stat && stat.netScore > 0) {
      favoriteGenresMap[g] = parseFloat(stat.netScore.toFixed(2));
    }
  });

  singleFavorites.forEach((g) => {
    const stat = genreStats[g];
    if (stat && stat.netScore > 0 && !dislikedGenresMap[g]) {
      favoriteGenresMap[g] = parseFloat(stat.netScore.toFixed(2));
    }
  });

  strongDislikes.forEach((g) => {
    const stat = genreStats[g];
    if (stat && stat.netScore < 0 && !favoriteGenresMap[g]) {
      dislikedGenresMap[g] = parseFloat(Math.abs(stat.netScore).toFixed(2));
    }
  });

  // Explicit safety guarantee: delete any intersection
  Object.keys(favoriteGenresMap).forEach((g) => {
    delete dislikedGenresMap[g];
  });

  // Highest and lowest rated genres (min 2 titles for significance)
  const sortedByAvg = Object.entries(genreStats)
    .filter(([, s]) => s.count >= 2)
    .sort((a, b) => b[1].avg - a[1].avg || b[1].count - a[1].count);

  const highestRatedGenre = sortedByAvg.length > 0 && sortedByAvg[0][1].avg >= 7.0
    ? { genre: sortedByAvg[0][0], avgRating: sortedByAvg[0][1].avg, count: sortedByAvg[0][1].count }
    : Object.entries(genreStats).length > 0
    ? {
        genre: Object.entries(genreStats).sort((a, b) => b[1].avg - a[1].avg)[0][0],
        avgRating: Object.entries(genreStats).sort((a, b) => b[1].avg - a[1].avg)[0][1].avg,
        count: Object.entries(genreStats).sort((a, b) => b[1].avg - a[1].avg)[0][1].count,
      }
    : null;

  const lowestCandidate = sortedByAvg
    .slice()
    .reverse()
    .find(([, s]) => s.avg <= 5.5 || s.lowCount > s.highCount);

  const lowestRatedGenre = lowestCandidate
    ? { genre: lowestCandidate[0], avgRating: lowestCandidate[1].avg, count: lowestCandidate[1].count }
    : strongDislikes.length > 0
    ? { genre: strongDislikes[0], avgRating: genreStats[strongDislikes[0]]?.avg ?? 4.0, count: genreStats[strongDislikes[0]]?.count ?? 2 }
    : null;

  // Storytelling Styles derived from reviews and high-rated titles
  const allReviews = movies
    .filter((m) => m.personal_review && m.personal_review.trim().length > 3)
    .map((m) => ({
      title: m.movie_name,
      rating: m.rating,
      text: m.personal_review.toLowerCase(),
    }));

  const storytellingStyles: string[] = [];
  const reviewKeywords: Record<string, string[]> = {
    "Atmospheric World-Building": ["world-building", "atmospheric", "cinematography", "visuals", "immersive"],
    "Cerebral & Mind-Bending Plots": ["mind-bending", "twist", "intellectual", "clever", "complex", "puzzle"],
    "Character-Driven Storytelling": ["character", "emotional", "performance", "depth", "heartfelt", "dialogue"],
    "High-Stakes & Fast-Paced Action": ["fast-paced", "adrenaline", "action", "thrilling", "intense", "suspense"],
    "Dark & Gritty Realism": ["dark", "gritty", "realistic", "raw", "cynical", "noir"],
    "Philosophical Themes": ["philosophical", "existential", "thought-provoking", "deep", "meaningful"],
  };

  Object.entries(reviewKeywords).forEach(([style, keywords]) => {
    const match = allReviews.some(
      (r) => r.rating >= 7 && keywords.some((k) => r.text.includes(k))
    );
    if (match) storytellingStyles.push(style);
  });

  if (storytellingStyles.length === 0) {
    if (strongLikes.includes("Science Fiction") || strongLikes.includes("Mystery")) {
      storytellingStyles.push("Cerebral & Mind-Bending Plots");
    }
    if (strongLikes.includes("Drama") || strongLikes.includes("Romance")) {
      storytellingStyles.push("Character-Driven Storytelling");
    }
    if (strongLikes.includes("Action") || strongLikes.includes("Thriller")) {
      storytellingStyles.push("High-Stakes & Fast-Paced Action");
    }
    if (strongLikes.includes("Crime") || strongLikes.includes("Horror")) {
      storytellingStyles.push("Dark & Gritty Realism");
    }
  }

  // Preferred Eras
  const eraCounts: Record<string, number> = {};
  completed.forEach((m) => {
    if (m.release_year > 0 && m.rating >= 7) {
      const era =
        m.release_year >= 2020
          ? "2020s"
          : m.release_year >= 2010
          ? "2010s"
          : m.release_year >= 2000
          ? "2000s"
          : m.release_year >= 1990
          ? "1990s"
          : m.release_year >= 1980
          ? "1980s"
          : "Classic";
      eraCounts[era] = (eraCounts[era] || 0) + 1;
    }
  });

  const preferredEras = Object.entries(eraCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([era]) => era);

  const movieCount = completed.filter((m) => m.type === "movie").length;
  const seriesCount = completed.filter((m) => m.type === "series").length;

  return {
    genreStats,
    favoriteGenresMap,
    dislikedGenresMap,
    strongLikes,
    singleFavorites,
    strongDislikes,
    mixedGenres,
    highestRatedGenre,
    lowestRatedGenre,
    storytellingStyles,
    preferredEras,
    movieCount,
    seriesCount,
  };
}

/**
 * Generate complete Taste DNA result including natural language summary.
 * Strictly guarantees that no genre appears as both an affinity and a dislike.
 */
export function generateTasteDna(
  movies: MovieRow[],
  _profileRecord?: RecommendationProfileRow | null
): TasteDnaResult {
  const analysis = analyzeUserTaste(movies);
  const {
    genreStats,
    strongLikes,
    singleFavorites,
    strongDislikes,
    storytellingStyles,
    preferredEras,
    highestRatedGenre,
    lowestRatedGenre,
    movieCount,
    seriesCount,
  } = analysis;

  const completed = movies.filter((m) => m.status === "completed" && m.rating > 0);
  const dropped = movies.filter((m) => m.status === "dropped");
  const allReviews = movies.filter((m) => m.personal_review && m.personal_review.trim().length > 3);

  // Frequency-ranked genre distribution for bar charts
  const favoriteGenres = Object.entries(genreStats)
    .map(([name, s]) => ({ name, value: s.count }))
    .sort((a, b) => b.value - a.value);

  // ── Construct Cohesive, Non-Contradictory Summary Paragraph ──
  let summaryParagraph = "";

  if (completed.length === 0 && dropped.length === 0) {
    summaryParagraph =
      "Your Taste DNA is currently calibrated to your baseline profile. As you rate completed movies and write personal reviews in your library, CineTaste will analyze your distinct genre affinities, storytelling preferences, and dislikes to map your cinematic identity.";
  } else if (completed.length < 3 && dropped.length === 0) {
    const sample = completed[0];
    const topG = strongLikes[0] || singleFavorites[0] || "cinema";
    summaryParagraph = `Early signals highlight an emerging affinity for ${topG}${
      sample ? `, anchored by your positive rating for "${sample.movie_name}"` : ""
    }. Because your library is in its initial stage, CineTaste treats these as early inclinations rather than definitive boundaries, looking forward to more ratings to distinguish sustained patterns from one-off discoveries.`;
  } else {
    const parts: string[] = [];

    // Part 1: Positive Core Affinities
    if (strongLikes.length > 0) {
      parts.push(
        `Your viewing history establishes a pronounced, consistent affinity for ${strongLikes.slice(0, 3).join(" and ")}, backed by repeatedly high ratings across multiple titles.`
      );
    } else if (singleFavorites.length > 0) {
      parts.push(
        `Your ratings show standout enthusiasm for individual titles in ${singleFavorites.slice(0, 2).join(" and ")}, though your preferences remain versatile across genres.`
      );
    }

    // Part 2: Storytelling Style and Themes
    if (storytellingStyles.length > 0) {
      parts.push(
        `You gravitate toward ${storytellingStyles.slice(0, 2).join(" and ").toLowerCase()}${
          allReviews.length > 0 ? ", frequently rewarding titles that deliver memorable emotional resonance and inventive craft" : ""
        }.`
      );
    }

    // Part 3: Dislikes or Filtered Patterns (Strictly disjoint from Part 1)
    if (strongDislikes.length > 0) {
      parts.push(
        `Conversely, ${strongDislikes.slice(0, 2).join(" and ")} trigger clear resistance in your ratings, reflecting a low tolerance for formulaic execution.`
      );
    } else if (dropped.length > 0) {
      parts.push(
        `Your dropped list indicates a decisive filter against titles that suffer from sluggish pacing or unengaging premises.`
      );
    } else {
      parts.push(
        `Your ratings show versatile exploration across different themes without persistent genre-level aversion.`
      );
    }

    // Part 4: Format & Era Balance
    const formatStr =
      movieCount > seriesCount * 2
        ? "feature films"
        : seriesCount > movieCount * 2
        ? "serialized television"
        : "both cinema and episodic series";
    const eraStr = preferredEras.length > 0 ? `with a strong center of gravity in ${preferredEras.join(" and ")} releases` : "";

    parts.push(
      `You lean predominantly toward ${formatStr}${eraStr ? ` ${eraStr}` : ""}, distinguishing well-crafted standalone experiences from routine filler.`
    );

    summaryParagraph = parts.join(" ");
  }

  // Safety Assertion: ensure strongLikes and strongDislikes never overlap
  const intersection = strongLikes.filter((g) => strongDislikes.includes(g));
  if (intersection.length > 0) {
    throw new Error(`Taste DNA Invariant Violation: Genres in both likes and dislikes: ${intersection.join(", ")}`);
  }

  return {
    summaryParagraph,
    strongLikes: strongLikes.length > 0 ? strongLikes : singleFavorites,
    strongDislikes,
    storytellingStyles,
    preferredEras,
    favoriteGenres,
    highestRatedGenre,
    lowestRatedGenre,
    genreAverages: genreStats,
  };
}
