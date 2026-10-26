/**
 * Filter an item by decade era
 */
export function matchesEra(year: number | undefined, era: string): boolean {
  if (!era || era === "All") return true;
  if (!year) return false;
  if (era === "2020s") return year >= 2020;
  if (era === "2010s") return year >= 2010 && year < 2020;
  if (era === "2000s") return year >= 2000 && year < 2010;
  if (era === "1990s") return year >= 1990 && year < 2000;
  if (era === "1980s") return year >= 1980 && year < 1990;
  if (era === "Classic") return year < 1980;
  return true;
}

/**
 * Complete TMDB Genre ID to Name Mapping across Movies and TV
 */
export const TMDB_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

/**
 * Extract all canonical genres provided by a title's genre tags.
 * Normalizes equivalent TMDB genre labels across Movies, Series, and Anime:
 * - "Action & Adventure" provides "Action", "Adventure", and "Action & Adventure".
 * - A title with both "Action" and "Adventure" provides "Action & Adventure".
 * - "Sci-Fi & Fantasy" provides "Sci-Fi", "Science Fiction", "Fantasy", and "Sci-Fi & Fantasy".
 * - A title with both "Sci-Fi" (or "Science Fiction") and "Fantasy" provides "Sci-Fi & Fantasy".
 * - "Science Fiction" and "Sci-Fi" are exact synonyms.
 * - "War & Politics" provides "War" and "War & Politics".
 * - "War" provides "War" and "War & Politics".
 */
export function getProvidedGenres(itemGenres: string[]): Set<string> {
  const provided = new Set<string>();
  const normalized = (itemGenres || []).map((g) => g.toLowerCase().trim()).filter(Boolean);

  let hasAction = false;
  let hasAdventure = false;
  let hasSciFi = false;
  let hasFantasy = false;

  for (const g of normalized) {
    provided.add(g);

    if (g === "action") {
      hasAction = true;
    } else if (g === "adventure") {
      hasAdventure = true;
    } else if (g === "action & adventure") {
      hasAction = true;
      hasAdventure = true;
      provided.add("action");
      provided.add("adventure");
    } else if (g === "science fiction" || g === "sci-fi") {
      hasSciFi = true;
      provided.add("science fiction");
      provided.add("sci-fi");
    } else if (g === "fantasy") {
      hasFantasy = true;
    } else if (g === "sci-fi & fantasy") {
      hasSciFi = true;
      hasFantasy = true;
      provided.add("sci-fi");
      provided.add("science fiction");
      provided.add("fantasy");
    } else if (g === "war") {
      provided.add("war & politics");
    } else if (g === "war & politics") {
      provided.add("war");
    }
  }

  // Titles that have both atomic components satisfy the compound label
  if (hasAction && hasAdventure) {
    provided.add("action & adventure");
  }
  if (hasSciFi && hasFantasy) {
    provided.add("sci-fi & fantasy");
  }

  return provided;
}

/**
 * Check if an item provides a specific target genre
 */
export function itemHasGenre(itemGenres: string[], targetGenre: string): boolean {
  if (!targetGenre) return true;
  const target = targetGenre.toLowerCase().trim();
  const provided = getProvidedGenres(itemGenres);
  return provided.has(target);
}

/**
 * Strict AND matching: item must provide EVERY selected genre,
 * while allowing any additional genres.
 */
export function itemMatchesAllGenres(itemGenres: string[], selectedGenres: string[]): boolean {
  const active = (selectedGenres || []).filter(Boolean);
  if (active.length === 0) return true;
  const provided = getProvidedGenres(itemGenres);
  return active.every((sg) => provided.has(sg.toLowerCase().trim()));
}

/**
 * Correctly map selected genre labels to TMDB genre IDs for discovery,
 * preserving correct IDs per media type and avoiding unrelated equivalents.
 */
export function getTmdbGenreIds(category: "movies" | "series" | "anime", genres: string[], subType?: "movie" | "tv"): number[] {
  const active = (genres || []).map((g) => g.trim()).filter(Boolean);
  if (active.length === 0) return [];

  const MOVIE_MAP: Record<string, number[]> = {
    "Action": [28],
    "Adventure": [12],
    "Action & Adventure": [28, 12],
    "Animation": [16],
    "Comedy": [35],
    "Crime": [80],
    "Documentary": [99],
    "Drama": [18],
    "Family": [10751],
    "Fantasy": [14],
    "History": [36],
    "Horror": [27],
    "Music": [10402],
    "Mystery": [9648],
    "Romance": [10749],
    "Science Fiction": [878],
    "Sci-Fi": [878],
    "Sci-Fi & Fantasy": [878, 14],
    "TV Movie": [10770],
    "Thriller": [53],
    "War": [10752],
    "War & Politics": [10752],
    "Western": [37],
  };

  const TV_MAP: Record<string, number[]> = {
    "Action": [10759],
    "Adventure": [10759],
    "Action & Adventure": [10759],
    "Animation": [16],
    "Comedy": [35],
    "Crime": [80],
    "Documentary": [99],
    "Drama": [18],
    "Family": [10751],
    "Kids": [10762],
    "Mystery": [9648],
    "News": [10763],
    "Reality": [10764],
    "Sci-Fi & Fantasy": [10765],
    "Sci-Fi": [10765],
    "Science Fiction": [10765],
    "Fantasy": [10765],
    "Soap": [10766],
    "Talk": [10767],
    "War & Politics": [10768],
    "War": [10768],
    "Western": [37],
  };

  const targetMap = category === "series" ? TV_MAP : category === "movies" ? MOVIE_MAP : (subType === "tv" ? TV_MAP : MOVIE_MAP);

  const ids = new Set<number>();
  for (const g of active) {
    const mapped = targetMap[g] || MOVIE_MAP[g] || TV_MAP[g];
    if (mapped) {
      mapped.forEach((id) => ids.add(id));
    }
  }

  return Array.from(ids);
}

