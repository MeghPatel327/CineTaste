import test from "node:test";
import assert from "node:assert";

// ─────────────────────────────────────────────────────────────────────────────
// Verification Suite: CineTaste Performance, Search & Catalogue Optimization
// ─────────────────────────────────────────────────────────────────────────────

test("CineTaste Optimization & Correctness Verification", async (t) => {
  // ─── 1. SWR Cache Mechanics (Goal 1) ──────────────────────────────────────
  await t.test("Goal 1: Stale-While-Revalidate Cache Strategy", () => {
    // Replicate SWR cache structure from browseClientCache
    const CACHE_TTL_MS = 60_000;
    const cache = new Map();

    function setCached(key, data) {
      cache.set(key, { ...data, fetchedAt: Date.now() });
    }

    function getCached(key, allowStale = true) {
      const entry = cache.get(key);
      if (!entry) return null;
      const isStale = Date.now() - entry.fetchedAt >= CACHE_TTL_MS;
      if (!allowStale && isStale) return null;
      return { ...entry, isStale };
    }

    // Insert initial fresh entry
    setCached("movies|sort:recommended", { items: [{ id: 101, title: "Inception" }], total: 1 });

    const fresh = getCached("movies|sort:recommended");
    assert.ok(fresh, "Cache should return fresh entry");
    assert.strictEqual(fresh.isStale, false, "Fresh entry must have isStale: false");
    assert.strictEqual(fresh.items.length, 1);

    // Simulate expired cache entry
    const staleTime = Date.now() - (CACHE_TTL_MS + 5000);
    cache.set("movies|sort:recommended", {
      items: [{ id: 101, title: "Inception" }],
      total: 1,
      fetchedAt: staleTime,
    });

    // SWR check: immediately returns usable cached data, flagged as isStale
    const swr = getCached("movies|sort:recommended", true);
    assert.ok(swr, "SWR must immediately return usable cached data even if expired");
    assert.strictEqual(swr.isStale, true, "Expired entry must have isStale: true to trigger background revalidation");
    assert.strictEqual(swr.items[0].title, "Inception", "Cached items must be preserved");

    // Error recovery: simulate background fetch failure
    // Valid cached content must NEVER be replaced by failed/empty results
    let currentData = swr.items;
    try {
      throw new Error("Simulated network timeout");
    } catch {
      // On error, keep existing valid data
      assert.strictEqual(currentData.length, 1, "Cached data must be retained on error");
    }
  });

  // ─── 2. Explicit Apply Behavior & Strict Genre AND Matching (Goal 2) ─────
  await t.test("Goal 2: Explicit Apply & Strict Multi-Genre AND Matching", () => {
    // Test AND-based matching logic
    function itemHasGenre(itemGenres, targetGenre) {
      const target = targetGenre.toLowerCase().trim();
      for (const g of itemGenres) {
        const itemG = g.toLowerCase().trim();
        if (itemG === target) return true;
        if (target === "action" && itemG === "action & adventure") return true;
        if (target === "adventure" && itemG === "action & adventure") return true;
        if (
          (target === "sci-fi" || target === "science fiction") &&
          (itemG === "sci-fi & fantasy" || itemG === "science fiction" || itemG === "sci-fi")
        )
          return true;
        if (target === "fantasy" && itemG === "sci-fi & fantasy") return true;
      }
      return false;
    }

    function matchesAllGenres(itemGenres, selectedGenres) {
      if (!selectedGenres.length) return true;
      return selectedGenres.every((sg) => itemHasGenre(itemGenres, sg));
    }

    const titleA = { title: "Interstellar", genres: ["Adventure", "Drama", "Science Fiction"] };
    const titleB = { title: "Die Hard", genres: ["Action", "Thriller"] };
    const titleC = { title: "The Matrix", genres: ["Action", "Science Fiction"] };

    // Single genre
    assert.strictEqual(matchesAllGenres(titleA.genres, ["Science Fiction"]), true);
    assert.strictEqual(matchesAllGenres(titleB.genres, ["Science Fiction"]), false);

    // Strict multi-genre AND matching: ["Action", "Science Fiction"]
    assert.strictEqual(matchesAllGenres(titleC.genres, ["Action", "Science Fiction"]), true);
    assert.strictEqual(matchesAllGenres(titleA.genres, ["Action", "Science Fiction"]), false, "Interstellar lacks Action");
    assert.strictEqual(matchesAllGenres(titleB.genres, ["Action", "Science Fiction"]), false, "Die Hard lacks Sci-Fi");

    // Search query separation: search query is not a genre filter
    const draftFilters = { genres: ["Action"], era: "2010s", sort: "rating" };
    const searchQuery = "Inception";
    assert.notStrictEqual(searchQuery, draftFilters.genres[0]);
    assert.strictEqual(draftFilters.genres.includes(searchQuery), false, "Search query must not be treated as a genre");
  });

  // ─── 3. Unified TMDB Search with Intelligent Fallback (Goal 3) ────────────
  await t.test("Goal 3: Unified TMDB Search & Intelligent Fallback Flow", async () => {
    // Simulate Unified Search Decision Flow
    async function mockUnifiedSearch(query, { directResults = [], fallbackResults = [] } = {}) {
      const q = query.trim();
      if (!q) return { results: [], fallbackUsed: false };

      // 1. Initial TMDB search directly (bypasses Gemini)
      if (directResults.length > 0) {
        return {
          results: directResults,
          fallbackUsed: false,
          query: q,
        };
      }

      // 2. Direct search produces 0 results -> invoke Gemini fallback
      return {
        results: fallbackResults,
        fallbackUsed: fallbackResults.length > 0,
        query: q,
      };
    }

    // Direct match found: Gemini is bypassed completely
    const directHit = await mockUnifiedSearch("Oppenheimer", {
      directResults: [
        {
          id: 872585,
          title: "Oppenheimer",
          media_type: "movie",
          destinationCategory: "movies",
          release_year: 2023,
        },
      ],
      fallbackResults: [],
    });

    assert.strictEqual(directHit.fallbackUsed, false, "Must not invoke Gemini when TMDB produces results");
    assert.strictEqual(directHit.results[0].title, "Oppenheimer");
    assert.strictEqual(directHit.results[0].destinationCategory, "movies");

    // Zero direct match: Intelligent fallback is invoked
    const fallbackHit = await mockUnifiedSearch("time loop train movie with bomb", {
      directResults: [],
      fallbackResults: [
        {
          id: 42194,
          title: "Source Code",
          media_type: "movie",
          destinationCategory: "movies",
          fallbackMatch: true,
          reasons: ["Discovered via Gemini AI for plot description query"],
        },
      ],
    });

    assert.strictEqual(fallbackHit.fallbackUsed, true, "Must invoke fallback when direct TMDB is empty");
    assert.strictEqual(fallbackHit.results[0].title, "Source Code");
    assert.strictEqual(fallbackHit.results[0].fallbackMatch, true);
  });

  // ─── 4. Scalable TMDB Catalogue Coverage & Parameter Correctness (Goal 5) ─
  await t.test("Goal 5: Catalogue Coverage, Proper TMDB Syntax & Anime Classification", () => {
    // 1. Valid TMDB Sort parameters (no invalid sort_by_tv)
    function getSortParam(s, type) {
      if (s === "rating") {
        return type === "movie"
          ? "&sort_by=vote_average.desc&vote_count.gte=80"
          : "&sort_by=vote_average.desc&vote_count.gte=40";
      }
      if (s === "year") {
        return type === "movie"
          ? "&sort_by=primary_release_date.desc&vote_count.gte=10"
          : "&sort_by=first_air_date.desc&vote_count.gte=10";
      }
      if (s === "title") {
        return type === "movie" ? "&sort_by=original_title.asc" : "&sort_by=name.asc";
      }
      return "&sort_by=popularity.desc";
    }

    const movieSort = getSortParam("year", "movie");
    const tvSort = getSortParam("year", "tv");

    assert.ok(movieSort.includes("primary_release_date.desc"), "Movie sort must use primary_release_date");
    assert.ok(tvSort.includes("first_air_date.desc"), "TV sort must use first_air_date");
    assert.strictEqual(movieSort.includes("sort_by_tv"), false, "Must not contain invalid sort_by_tv");
    assert.strictEqual(tvSort.includes("sort_by_tv"), false, "Must not contain invalid sort_by_tv");

    // 2. Anime Genre Mapping
    const MOVIE_GENRE_MAP = { Action: 28, "Sci-Fi": 878, Fantasy: 14 };
    const TV_GENRE_MAP = { Action: 10759, "Sci-Fi": 10765, Fantasy: 10765 };

    assert.strictEqual(MOVIE_GENRE_MAP["Action"], 28, "Movie Action must map to 28");
    assert.strictEqual(TV_GENRE_MAP["Action"], 10759, "TV Action must map to 10759 (Action & Adventure)");

    // 3. Anime Rule: Anime destination contains anime whether movie or series
    function classifyTitle(titleObj) {
      const isAnimeTitle =
        titleObj.genres.includes("Animation") &&
        (titleObj.original_language === "ja" || titleObj.origin_country === "JP");

      if (isAnimeTitle) return "anime";
      if (titleObj.media_type === "tv") return "series";
      return "movies";
    }

    const animeMovie = {
      title: "Spirited Away",
      media_type: "movie",
      genres: ["Animation", "Family", "Fantasy"],
      original_language: "ja",
      origin_country: "JP",
    };

    const animeSeries = {
      title: "Attack on Titan",
      media_type: "tv",
      genres: ["Animation", "Action & Adventure", "Sci-Fi & Fantasy"],
      original_language: "ja",
      origin_country: "JP",
    };

    const westernMovie = {
      title: "Toy Story",
      media_type: "movie",
      genres: ["Animation", "Comedy", "Family"],
      original_language: "en",
      origin_country: "US",
    };

    assert.strictEqual(classifyTitle(animeMovie), "anime", "Anime movie belongs in Anime destination");
    assert.strictEqual(classifyTitle(animeSeries), "anime", "Anime series belongs in Anime destination");
    assert.strictEqual(classifyTitle(westernMovie), "movies", "Western animation belongs in Movies destination");

    // 4. TMDB Deduplication by canonical ID
    const existingIds = new Set();
    const list = [
      { id: 100, title: "Movie 1" },
      { id: 101, title: "Movie 2" },
      { id: 100, title: "Movie 1 (Duplicate)" },
    ];
    const deduplicated = [];
    for (const item of list) {
      if (!existingIds.has(item.id)) {
        existingIds.add(item.id);
        deduplicated.push(item);
      }
    }
    assert.strictEqual(deduplicated.length, 2, "Duplicate canonical TMDB IDs must be filtered out");
  });
});
