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
 * Check if an item matches genre name accounting for sub-genres and TV/Anime synonyms
 */
export function itemHasGenre(itemGenres: string[], targetGenre: string): boolean {
  const target = targetGenre.toLowerCase().trim();
  for (const g of itemGenres) {
    const itemG = g.toLowerCase().trim();
    if (itemG === target) return true;

    // Action / Adventure
    if (target === "action" && (itemG === "action & adventure" || itemG === "action")) return true;
    if (target === "adventure" && (itemG === "action & adventure" || itemG === "adventure")) return true;
    if (target === "action & adventure" && (itemG === "action" || itemG === "adventure" || itemG === "action & adventure")) return true;

    // Sci-Fi / Science Fiction / Fantasy
    const isSciFiTarget = target === "sci-fi" || target === "science fiction";
    const isSciFiItem = itemG === "sci-fi" || itemG === "science fiction";
    if (isSciFiTarget && (isSciFiItem || itemG === "sci-fi & fantasy")) return true;
    if (target === "fantasy" && (itemG === "fantasy" || itemG === "sci-fi & fantasy")) return true;
    if (target === "sci-fi & fantasy" && (isSciFiItem || itemG === "fantasy" || itemG === "sci-fi & fantasy")) return true;

    // War / War & Politics
    if (target === "war" && (itemG === "war & politics" || itemG === "war")) return true;
    if (target === "war & politics" && (itemG === "war" || itemG === "politics" || itemG === "war & politics")) return true;
  }
  return false;
}
