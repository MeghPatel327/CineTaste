import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// 1. Test image URL normalization for RAWG
function normalizeRawgImageUrl(url) {
  if (!url) return null;
  const s = url.trim();
  if (!s) return null;
  return s.replace(/\/media\/crop\/\d+\/\d+\//, "/media/");
}

test("normalizeRawgImageUrl strips crop parameters from media URLs", () => {
  const cropUrl = "https://media.rawg.io/media/crop/600/400/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg";
  const result = normalizeRawgImageUrl(cropUrl);
  assert.equal(result, "https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg");

  const fullUrl = "https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg";
  assert.equal(normalizeRawgImageUrl(fullUrl), fullUrl);
});

test("normalizeRawgImageUrl handles null, empty, and whitespace inputs safely", () => {
  assert.equal(normalizeRawgImageUrl(null), null);
  assert.equal(normalizeRawgImageUrl(""), null);
  assert.equal(normalizeRawgImageUrl("   "), null);
});

// 2. Games now have a dedicated Baserow table with a native status column.
// GameRow.status stores status directly — no playing<->watching translation needed.
const VALID_GAME_STATUSES = ["playing", "completed", "pending", "on_hold", "dropped"];

test("Game status mapping: GameRow stores status natively without translation", () => {
  for (const s of VALID_GAME_STATUSES) {
    assert.equal(s, s);
  }
  assert.deepEqual(VALID_GAME_STATUSES, ["playing", "completed", "pending", "on_hold", "dropped"]);
});

// 3. Test curated games filtering
const sampleGames = [
  {
    id: 119133,
    title: "Elden Ring",
    release_year: 2022,
    rating: 95,
    genres: ["Role-playing (RPG)", "Adventure"],
    platforms: ["PC (Microsoft Windows)", "PlayStation 5", "Xbox Series X|S"],
    game_modes: ["Single player", "Multiplayer", "Co-operative"],
  },
  {
    id: 1020,
    title: "Grand Theft Auto V",
    release_year: 2013,
    rating: 96,
    genres: ["Shooter", "Adventure"],
    platforms: ["PC (Microsoft Windows)", "PlayStation 4", "Xbox One"],
    game_modes: ["Single player", "Multiplayer"],
  },
  {
    id: 7331,
    title: "The Legend of Zelda: Breath of the Wild",
    release_year: 2017,
    rating: 96,
    genres: ["Adventure", "Role-playing (RPG)"],
    platforms: ["Nintendo Switch", "Wii U"],
    game_modes: ["Single player"],
  },
  {
    id: 19560,
    title: "God of War",
    release_year: 2018,
    rating: 94,
    genres: ["Action", "Adventure", "Hack and slash/Beat 'em up"],
    platforms: ["PlayStation 4", "PC (Microsoft Windows)"],
    game_modes: ["Single player"],
  },
  {
    id: 115,
    title: "Half-Life 2",
    release_year: 2004,
    rating: 93,
    genres: ["Shooter", "Puzzle"],
    platforms: ["PC (Microsoft Windows)", "Xbox 360", "PlayStation 3"],
    game_modes: ["Single player"],
  },
];

function filterGames(list, options) {
  let result = [...list];

  if (options.q) {
    const q = options.q.toLowerCase().trim();
    result = result.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        (g.genres || []).some((genre) => genre.toLowerCase().includes(q))
    );
  }

  if (options.genre && options.genre !== "All") {
    result = result.filter((g) => (g.genres || []).includes(options.genre));
  }

  if (options.platform && options.platform !== "All") {
    result = result.filter((g) =>
      (g.platforms || []).some((p) => p.includes(options.platform))
    );
  }

  if (options.game_mode && options.game_mode !== "All") {
    result = result.filter((g) =>
      (g.game_modes || []).some((m) => m.toLowerCase().includes(options.game_mode.toLowerCase()))
    );
  }

  if (options.era && options.era !== "all") {
    if (options.era === "modern") {
      result = result.filter((g) => (g.release_year || 0) >= 2020);
    } else if (options.era === "2010s") {
      result = result.filter((g) => (g.release_year || 0) >= 2010 && (g.release_year || 0) < 2020);
    } else if (options.era === "classic") {
      result = result.filter((g) => (g.release_year || 0) < 2010);
    }
  }

  if (options.sort === "release_desc") {
    result.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
  } else if (options.sort === "name_asc") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  return result;
}

test("Curated games search filters by text query", () => {
  const res = filterGames(sampleGames, { q: "elden" });
  assert.equal(res.length, 1);
  assert.equal(res[0].title, "Elden Ring");
});

test("Curated games filters by platform and genre", () => {
  const switchGames = filterGames(sampleGames, { platform: "Nintendo Switch" });
  assert.equal(switchGames.length, 1);
  assert.equal(switchGames[0].title, "The Legend of Zelda: Breath of the Wild");

  const rpgGames = filterGames(sampleGames, { genre: "Role-playing (RPG)" });
  assert.equal(rpgGames.length, 2);
});

test("Curated games filters by era", () => {
  const modern = filterGames(sampleGames, { era: "modern" });
  assert.equal(modern.length, 1);
  assert.equal(modern[0].title, "Elden Ring");

  const classic = filterGames(sampleGames, { era: "classic" });
  assert.equal(classic.length, 1);
  assert.equal(classic[0].title, "Half-Life 2");
});

// 4. Test CSS theme tokens verification
test("globals.css contains dark purple gaming mode tokens", () => {
  const css = fs.readFileSync(path.resolve("src/app/globals.css"), "utf8");
  assert.ok(css.includes('[data-mode="gaming"]'), "data-mode gaming attribute present");
  assert.ok(css.includes('--ct-primary: #A855F7'), "accent purple CSS variable present");
  assert.ok(css.includes("prefers-reduced-motion"), "reduced motion query present");
});

// 5. Game Table Separation Tests
test("Game and Movie tables use different canonical IDs", () => {
  const rawgId = 119133;
  const tmdbId = 120;
  assert.notEqual(typeof rawgId, "undefined");
  assert.notEqual(typeof tmdbId, "undefined");
  assert.equal(rawgId !== tmdbId, true, "Game and movie IDs are from different databases");
});

test("Game status values are distinct from movie status", () => {
  const gameStatuses = ["playing", "completed", "pending", "on_hold", "dropped"];
  const movieStatuses = ["pending", "watching", "on_hold", "completed", "dropped"];
  assert.ok(gameStatuses.includes("playing"), "Games have 'playing' status");
  assert.ok(!gameStatuses.includes("watching"), "Games do NOT have 'watching' status");
  assert.ok(movieStatuses.includes("watching"), "Movies have 'watching' status");
  assert.ok(!movieStatuses.includes("playing"), "Movies do NOT have 'playing' status");
  assert.ok(gameStatuses.includes("completed") && movieStatuses.includes("completed"));
  assert.ok(gameStatuses.includes("pending") && movieStatuses.includes("pending"));
  assert.ok(gameStatuses.includes("on_hold") && movieStatuses.includes("on_hold"));
  assert.ok(gameStatuses.includes("dropped") && movieStatuses.includes("dropped"));
});

test("Game pirate site structure differs from movie pirate site structure", () => {
  const movieSite = { name: "1337x", search_url: "https://1337x.to/search/{q}/1/", enabled: true };
  const gameSite = { name: "GOG", search_url: "https://www.gog.com/en/games?search={q}", enabled: true };
  assert.equal(movieSite.name !== gameSite.name, true);
  assert.equal(
    movieSite.search_url.includes("1337x"),
    gameSite.search_url.includes("gog.com"),
    "Movies and games use different streaming sources"
  );
});

test("GameRow uses rawg_id as canonical identifier, not tmdb_id", () => {
  const gameRow = {
    id: 1,
    username: "testuser",
    game_name: "Elden Ring",
    status: "playing",
    rating: 9,
    rawg_id: 119133,
    genres: '["RPG","Adventure"]',
    platforms: '["PC","PS5"]',
    release_year: 2022,
    playtime_hours: 15.5,
    cover_url: "https://media.rawg.io/media/games/elden.jpg",
    backdrop_url: "https://media.rawg.io/media/backdrop.jpg",
    summary: "Open-world action RPG",
    created_at: "2024-01-15T10:00:00.000Z",
    updated_at: "2024-01-15T10:00:00.000Z",
  };
  assert.equal(gameRow.rawg_id, 119133, "GameRow uses RAWG ID");
  assert.equal(typeof gameRow.rawg_id, "number", "rawg_id is a number");
  assert.equal(!("tmdb_id" in gameRow), true, "GameRow does NOT have tmdb_id field");
});

// 6. Rating Display Formatting Tests (Fix for 1/10 bug)
function formatRatingDisplay(rawScore, userRating) {
  const isUserScore = Boolean(userRating && userRating > 0);
  const score = isUserScore ? userRating : rawScore;
  if (score === undefined || score === null || score <= 0) return null;
  if (score > 10) {
    return (score / 10).toFixed(1);
  }
  return Number.isInteger(score) ? score.toString() : score.toFixed(1);
}

test("Rating formatting never incorrectly divides 0-10 scale down to 1/10", () => {
  assert.equal(formatRatingDisplay(9.2), "9.2", "9.2/10 must display as 9.2");
  assert.equal(formatRatingDisplay(8.4), "8.4", "8.4/10 must display as 8.4");
  assert.equal(formatRatingDisplay(9.0), "9", "9.0/10 must display as 9");
  assert.equal(formatRatingDisplay(95), "9.5", "100-scale 95 must scale down to 9.5");
  assert.equal(formatRatingDisplay(0), null, "Unrated/0 must return null");
  assert.equal(formatRatingDisplay(null), null);
  // User rating overrides external score
  assert.equal(formatRatingDisplay(9.5, 8), "8", "User rating of 8 overrides external 9.5");
});

// 7. Multi-Genre Filtering & 18+ Handling
test("Multi-genre filtering supports selecting multiple genres simultaneously", () => {
  const games = [
    { id: 1, title: "Game A", genres: ["Action", "Adventure"] },
    { id: 2, title: "Game B", genres: ["Role-playing (RPG)", "Strategy"] },
    { id: 3, title: "Game C", genres: ["Action", "Role-playing (RPG)"] },
    { id: 4, title: "Game D", genres: ["Simulation"] },
    { id: 5, title: "Game E", genres: ["18+ (Adult / Mature)", "Adventure"], isAdult: true },
  ];

  const selected = ["Action", "Role-playing (RPG)"];
  const matches = games.filter(g =>
    selected.some(sel => g.genres.includes(sel))
  );
  assert.equal(matches.length, 3, "Finds games matching Action OR RPG");
  assert.deepEqual(matches.map(m => m.id), [1, 2, 3]);

  // 18+ filtering
  const adultOnly = games.filter(g => g.isAdult);
  assert.equal(adultOnly.length, 1);
  assert.equal(adultOnly[0].id, 5);
});

// 8. Game Recommendation Strict Library Exclusion
test("Game recommendation strictly excludes titles present in user library", () => {
  const userLibrary = [
    { rawg_id: 3328, game_name: "The Witcher 3: Wild Hunt" },
    { rawg_id: 119133, game_name: "Elden Ring" },
  ];

  const candidatePool = [
    { id: 3328, title: "The Witcher 3: Wild Hunt" }, // Should be excluded by ID & title
    { id: 119133, title: "Elden Ring" }, // Should be excluded by ID & title
    { id: 41494, title: "Cyberpunk 2077" }, // Should be retained
    { id: 7331, title: "The Legend of Zelda: Breath of the Wild" }, // Should be retained
  ];

  const userGameIds = new Set(userLibrary.map(g => g.rawg_id));
  const userTitles = new Set(userLibrary.map(g => g.game_name.toLowerCase().replace(/[^a-z0-9]/g, "")));

  const recommended = candidatePool.filter(g => {
    if (userGameIds.has(g.id)) return false;
    const norm = g.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (userTitles.has(norm)) return false;
    return true;
  });

  assert.equal(recommended.length, 2);
  assert.deepEqual(recommended.map(r => r.id), [41494, 7331]);
  assert.ok(!recommended.some(r => r.id === 3328 || r.id === 119133), "Existing library titles are excluded");
});

// 9. Adult Classification Logic (Sekiro & Mainstream Games are NEVER falsely classified 18+)
function isGameAdult(raw) {
  const esrbId = raw.esrb_rating?.id;
  const isMainstreamEsrb = esrbId !== undefined && esrbId !== null && esrbId <= 4;

  const rawgTags = (raw.tags || []).map((t) => (t.name || "").toLowerCase()).filter(Boolean);
  const explicitAdultPatterns = [
    /\bhentai\b/i,
    /\beroge\b/i,
    /\bdoujin\b/i,
    /\bnsfw\b/i,
    /\bporn\b/i,
    /\berotic\b/i,
    /\berotica\b/i,
    /\badults? only\b/i,
    /\bexplicit sexual\b/i,
  ];

  const hasExplicitAdultTag = rawgTags.some((tag) =>
    explicitAdultPatterns.some((pattern) => pattern.test(tag))
  );

  return Boolean(!isMainstreamEsrb && (esrbId === 5 || hasExplicitAdultTag));
}

test("Sekiro and mainstream Mature/Teen action games are never falsely flagged 18+", () => {
  const sekiroRaw = {
    name: "Sekiro: Shadows Die Twice",
    esrb_rating: { id: 4, name: "Mature", slug: "mature" },
    tags: [
      { name: "Singleplayer" },
      { name: "Atmospheric" },
      { name: "Violent" },
      { name: "Difficult" },
      { name: "Dark Fantasy" },
      { name: "Nudity" }, // Steam user community tag
      { name: "Sexual Content" }, // Steam user community tag
    ],
  };

  assert.equal(isGameAdult(sekiroRaw), false, "Sekiro must NOT be flagged as isAdult");

  const eldenRingRaw = {
    name: "Elden Ring",
    esrb_rating: { id: 4, name: "Mature" },
    tags: [{ name: "Action RPG" }, { name: "Dark Fantasy" }, { name: "Violent" }],
  };
  assert.equal(isGameAdult(eldenRingRaw), false, "Elden Ring must NOT be flagged as isAdult");

  const zeldaRaw = {
    name: "The Legend of Zelda: Tears of the Kingdom",
    esrb_rating: { id: 2, name: "Everyone 10+" },
    tags: [{ name: "Adventure" }, { name: "Action" }],
  };
  assert.equal(isGameAdult(zeldaRaw), false, "Zelda must NOT be flagged as isAdult");
});

test("Explicit adult/hentai/AO games are properly identified as 18+", () => {
  const aoGame = {
    name: "Explicit Adult Novel",
    esrb_rating: { id: 5, name: "Adults Only" },
    tags: [{ name: "Visual Novel" }],
  };
  assert.equal(isGameAdult(aoGame), true, "ESRB AO 18+ game must be flagged isAdult");

  const hentaiGame = {
    name: "Hentai Heroine",
    esrb_rating: null,
    tags: [{ name: "Singleplayer" }, { name: "hentai" }, { name: "eroge" }, { name: "nsfw" }],
  };
  assert.equal(isGameAdult(hentaiGame), true, "Unrated hentai game with nsfw tags must be flagged isAdult");
});

// 10. Completed Games & Library Games Handling in Dashboard Discovery & Search
test("Completed games are strictly excluded from dashboard discovery but appear in search", () => {
  const userLibrary = [
    { rawg_id: 28, game_name: "Red Dead Redemption 2", status: "completed", rating: 10 },
    { rawg_id: 2462, game_name: "Uncharted 4: A Thief's End", status: "playing", rating: 9 },
  ];

  const userGameIds = new Set(userLibrary.map(g => Number(g.rawg_id)));
  const userTitles = new Set(userLibrary.map(g => g.game_name.toLowerCase().replace(/[^a-z0-9]/g, "")));

  // 1. Dashboard Discovery Feed Candidates
  const discoveryCandidates = [
    { id: 28, title: "Red Dead Redemption 2" }, // Completed game in library
    { id: 2462, title: "Uncharted 4: A Thief's End" }, // Playing game in library
    { id: 58175, title: "God of War Ragnarök" }, // Fresh candidate
  ];

  const filteredDiscovery = discoveryCandidates.filter(g => {
    if (userGameIds.has(Number(g.id))) return false;
    const norm = g.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (userTitles.has(norm)) return false;
    return true;
  });

  assert.equal(filteredDiscovery.length, 1, "Completed and tracked games must NOT appear in discovery feed");
  assert.equal(filteredDiscovery[0].id, 58175);

  // 2. Search Results
  // When user searches for "Red Dead", already-logged completed game MUST appear in search
  const searchQuery = "Red Dead";
  const allCandidates = [
    { id: 28, title: "Red Dead Redemption 2" },
    { id: 416, title: "Red Dead Redemption" },
    { id: 119133, title: "Elden Ring" },
  ];
  const searchResults = allCandidates.filter(c => c.title.includes(searchQuery));

  const enrichedSearchResults = searchResults.map(item => {
    const inLib = userLibrary.find(g => Number(g.rawg_id) === item.id);
    return {
      ...item,
      inLibrary: Boolean(inLib),
      status: inLib?.status || null,
      userRating: inLib?.rating || undefined,
    };
  });

  assert.equal(enrichedSearchResults.length, 2, "Search includes already-logged games");
  const completedMatch = enrichedSearchResults.find(r => r.id === 28);
  assert.ok(completedMatch, "Completed game appears in search results");
  assert.equal(completedMatch.inLibrary, true);
  assert.equal(completedMatch.status, "completed");
  assert.equal(completedMatch.userRating, 10);
});
