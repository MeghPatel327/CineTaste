import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// 1. Test image URL normalization
function normalizeIgdbImageUrl(url, size = "t_cover_big") {
  if (!url) return null;
  let normalized = url.trim();
  if (normalized.startsWith("//")) {
    normalized = `https:${normalized}`;
  }
  normalized = normalized.replace(/\/t_[a-z0-9_]+\//, `/${size}/`);
  return normalized;
}

test("normalizeIgdbImageUrl handles protocol-relative URLs and sets size", () => {
  const raw = "//images.igdb.com/igdb/image/upload/t_thumb/co1r7f.jpg";
  const result = normalizeIgdbImageUrl(raw, "t_cover_big");
  assert.equal(result, "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg");

  const hdResult = normalizeIgdbImageUrl(raw, "t_1080p");
  assert.equal(hdResult, "https://images.igdb.com/igdb/image/upload/t_1080p/co1r7f.jpg");
});

test("normalizeIgdbImageUrl handles null and empty inputs safely", () => {
  assert.equal(normalizeIgdbImageUrl(null), null);
  assert.equal(normalizeIgdbImageUrl(""), null);
});

// 2. Test status mapping (playing <-> watching)
function mapGameStatusToRowStatus(status) {
  if (status === "playing") return "watching";
  return status;
}

function mapRowStatusToGameStatus(status) {
  if (status === "watching") return "playing";
  return status;
}

test("Game status mapping transforms playing <-> watching correctly", () => {
  assert.equal(mapGameStatusToRowStatus("playing"), "watching");
  assert.equal(mapGameStatusToRowStatus("completed"), "completed");
  assert.equal(mapGameStatusToRowStatus("pending"), "pending");
  assert.equal(mapGameStatusToRowStatus("on_hold"), "on_hold");
  assert.equal(mapGameStatusToRowStatus("dropped"), "dropped");

  assert.equal(mapRowStatusToGameStatus("watching"), "playing");
  assert.equal(mapRowStatusToGameStatus("completed"), "completed");
  assert.equal(mapRowStatusToGameStatus("pending"), "pending");
  assert.equal(mapRowStatusToGameStatus("on_hold"), "on_hold");
  assert.equal(mapRowStatusToGameStatus("dropped"), "dropped");
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
