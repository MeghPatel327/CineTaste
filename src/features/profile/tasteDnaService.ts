import type { MovieRow } from "@/features/movies/movieRepository";
import type { RecommendationProfileRow } from "@/features/recommendations/recommendationProfileRepository";

export interface TasteDnaResult {
  summaryParagraph: string;
  strongLikes: string[];
  strongDislikes: string[];
  storytellingStyles: string[];
  preferredEras: string[];
  favoriteGenres: { name: string; value: number }[];
  highestRatedGenre: { genre: string; avgRating: number; count: number } | null;
  lowestRatedGenre: { genre: string; avgRating: number; count: number } | null;
  genreAverages: Record<string, { avg: number; count: number; highCount: number; lowCount: number }>;
}

/**
 * Generate an accurate, nuanced Taste DNA summary based on the user's complete viewing history,
 * ratings, and personal reviews. Distinguishes strong multi-title patterns from isolated weak signals.
 */
export function generateTasteDna(
  movies: MovieRow[],
  profileRecord?: RecommendationProfileRow | null
): TasteDnaResult {
  const completed = movies.filter((m) => m.status === "completed" && m.rating > 0);
  const dropped = movies.filter((m) => m.status === "dropped");
  const pending = movies.filter((m) => m.status === "pending");

  // Collect genre statistics
  const genreAverages: Record<
    string,
    { sum: number; count: number; highCount: number; lowCount: number; titles: string[] }
  > = {};

  const parseGenres = (gStr: string): string[] => {
    if (!gStr) return [];
    try {
      const parsed = JSON.parse(gStr);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      // split comma
    }
    return gStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  completed.forEach((m) => {
    const genres = parseGenres(m.genres);
    genres.forEach((g) => {
      if (!genreAverages[g]) {
        genreAverages[g] = { sum: 0, count: 0, highCount: 0, lowCount: 0, titles: [] };
      }
      genreAverages[g].sum += m.rating;
      genreAverages[g].count += 1;
      genreAverages[g].titles.push(m.movie_name);
      if (m.rating >= 8) genreAverages[g].highCount += 1;
      if (m.rating <= 4) genreAverages[g].lowCount += 1;
    });
  });

  dropped.forEach((m) => {
    const genres = parseGenres(m.genres);
    genres.forEach((g) => {
      if (!genreAverages[g]) {
        genreAverages[g] = { sum: 0, count: 0, highCount: 0, lowCount: 0, titles: [] };
      }
      // Dropped counts as negative signal
      genreAverages[g].count += 1;
      genreAverages[g].lowCount += 1;
      genreAverages[g].titles.push(m.movie_name);
      if (m.rating > 0) {
        genreAverages[g].sum += m.rating;
      } else {
        genreAverages[g].sum += 2; // treat unrated dropped as 2/10
      }
    });
  });

  // Calculate clean averages
  const genreStats: Record<
    string,
    { avg: number; count: number; highCount: number; lowCount: number }
  > = {};

  Object.entries(genreAverages).forEach(([g, data]) => {
    genreStats[g] = {
      avg: parseFloat((data.sum / data.count).toFixed(1)),
      count: data.count,
      highCount: data.highCount,
      lowCount: data.lowCount,
    };
  });

  // Determine highest and lowest rated genres (min 2 titles for significance, or fallback to highest)
  const rankedGenres = Object.entries(genreStats).sort((a, b) => {
    // Prioritize genres with multiple titles, then highest average
    if (a[1].count >= 2 && b[1].count < 2) return -1;
    if (b[1].count >= 2 && a[1].count < 2) return 1;
    return b[1].avg - a[1].avg;
  });

  const highestRatedGenre = rankedGenres.length > 0
    ? { genre: rankedGenres[0][0], avgRating: rankedGenres[0][1].avg, count: rankedGenres[0][1].count }
    : null;

  const lowestGenres = Object.entries(genreStats)
    .filter(([g]) => genreStats[g].avg < 6.5 || genreStats[g].lowCount > 0)
    .sort((a, b) => a[1].avg - b[1].avg);

  const lowestRatedGenre = lowestGenres.length > 0
    ? { genre: lowestGenres[0][0], avgRating: lowestGenres[0][1].avg, count: lowestGenres[0][1].count }
    : null;

  // Distinguish strong likes (count >= 2 and avg >= 7.5 OR highCount >= 2)
  const strongLikes: string[] = [];
  const singleFavorites: string[] = [];

  Object.entries(genreStats).forEach(([g, stat]) => {
    if (stat.count >= 2 && stat.avg >= 7.5) {
      strongLikes.push(g);
    } else if (stat.count === 1 && stat.avg >= 9) {
      singleFavorites.push(g);
    }
  });

  // Distinguish strong dislikes (count >= 2 and avg <= 5.0 OR lowCount >= 2 OR dropped)
  const strongDislikes: string[] = [];
  Object.entries(genreStats).forEach(([g, stat]) => {
    if ((stat.count >= 2 && stat.avg <= 5.0) || stat.lowCount >= 2) {
      strongDislikes.push(g);
    }
  });

  // Scan personal reviews for themes, pacing, and storytelling styles
  const allReviews = movies
    .filter((m) => m.personal_review && m.personal_review.trim().length > 3)
    .map((m) => ({
      title: m.movie_name,
      rating: m.rating,
      status: m.status,
      text: m.personal_review!.toLowerCase(),
    }));

  const storytellingStyles: string[] = [];
  const reviewKeywords = {
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

  // If no review keywords matched, infer storytelling styles from high-rated genres
  if (storytellingStyles.length === 0) {
    if (strongLikes.includes("Science Fiction") || strongLikes.includes("Mystery")) {
      storytellingStyles.push("Cerebral & Mind-Bending Plots");
    }
    if (strongLikes.includes("Drama") || strongLikes.includes("Romance")) {
      storytellingStyles.push("Character-Driven Storytelling");
    }
    if (strongLikes.includes("Action") || strongLikes.includes("Thriller")) {
      storytellingStyles.push("High-Stakes & Fast-Paced Suspense");
    }
    if (strongLikes.includes("Crime") || strongLikes.includes("Horror")) {
      storytellingStyles.push("Dark & Atmospheric Realism");
    }
  }

  // Preferred eras
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

  // Format ratio (movies vs series)
  const movieCount = completed.filter((m) => m.type === "movie").length;
  const seriesCount = completed.filter((m) => m.type === "series").length;

  // Favorite genres sorted by frequency & rating
  const favoriteGenres = Object.entries(genreStats)
    .map(([name, s]) => ({ name, value: s.count }))
    .sort((a, b) => b.value - a.value);

  // ── Construct Natural, Cohesive Summary Paragraph ──
  let summaryParagraph = "";

  if (completed.length === 0 && dropped.length === 0) {
    summaryParagraph =
      "Your Taste DNA is currently calibrated to your baseline profile. As you rate completed movies and write personal reviews in your library, CineTaste will analyze your distinct genre affinities, storytelling preferences, and dislikes to map your cinematic identity.";
  } else if (completed.length < 3) {
    const sample = completed[0];
    const topG = strongLikes[0] || singleFavorites[0] || "cinema";
    summaryParagraph = `Early signals highlight an emerging affinity for ${topG}${
      sample ? `, anchored by your positive rating for "${sample.movie_name}"` : ""
    }. Because your library is in its initial stage, CineTaste treats these as early inclinations rather than definitive boundaries, looking forward to more ratings to distinguish sustained patterns from one-off discoveries.`;
  } else {
    const parts: string[] = [];

    // Part 1: Strong Core Likes
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
          allReviews.length > 0 ? ", frequently rewarding films that deliver memorable emotional resonance and inventive craft" : ""
        }.`
      );
    }

    // Part 3: Strong Dislikes or Dropped Patterns
    if (strongDislikes.length > 0) {
      parts.push(
        `Conversely, ${strongDislikes.slice(0, 2).join(" and ")} trigger clear resistance in your ratings, reflecting a low tolerance for formulaic tropes or uneven execution.`
      );
    } else if (dropped.length > 0) {
      parts.push(
        `Your dropped list indicates a decisive filter against titles that suffer from sluggish pacing or unengaging premises.`
      );
    }

    // Part 4: Era & Format nuance
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

