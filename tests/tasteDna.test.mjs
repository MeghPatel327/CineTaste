import test from "node:test";
import assert from "node:assert/strict";

// Import pure functions directly
import {
  analyzeUserTaste,
  generateTasteDna,
  parseGenresList,
} from "../src/features/profile/tasteDnaService.ts";

function createMockMovie(overrides = {}) {
  return {
    id: 1,
    username: "testuser",
    movie_name: "Mock Title",
    type: "movie",
    status: "completed",
    rating: 8,
    personal_review: "",
    watch_order_rank: null,
    watch_link: null,
    tmdb_id: 100,
    genres: JSON.stringify(["Action", "Adventure"]),
    release_year: 2022,
    runtime: 120,
    language: "en",
    poster_url: "",
    overview: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

test("parseGenresList handles JSON arrays and comma-separated strings", () => {
  assert.deepEqual(parseGenresList('["Action", "Thriller"]'), ["Action", "Thriller"]);
  assert.deepEqual(parseGenresList("Action, Sci-Fi, Drama"), ["Action", "Sci-Fi", "Drama"]);
  assert.deepEqual(parseGenresList(""), []);
  assert.deepEqual(parseGenresList(null), []);
});

test("Mutual Exclusivity: Strong Likes and Strong Dislikes must NEVER overlap", () => {
  // User has high rated action/adventure, and poor rated horror
  const movies = [
    createMockMovie({ id: 1, movie_name: "Action Hit 1", genres: '["Action", "Sci-Fi"]', rating: 9 }),
    createMockMovie({ id: 2, movie_name: "Action Hit 2", genres: '["Action", "Adventure"]', rating: 8 }),
    createMockMovie({ id: 3, movie_name: "Horror Flop 1", genres: '["Horror"]', rating: 3 }),
    createMockMovie({ id: 4, movie_name: "Horror Flop 2", genres: '["Horror"]', rating: 2 }),
  ];

  const analysis = analyzeUserTaste(movies);
  const result = generateTasteDna(movies);

  // Assert neither array shares any genre
  for (const like of analysis.strongLikes) {
    assert.equal(
      analysis.strongDislikes.includes(like),
      false,
      `Genre "${like}" appeared in both strongLikes and strongDislikes`
    );
  }

  for (const like of result.strongLikes) {
    assert.equal(
      result.strongDislikes.includes(like),
      false,
      `Genre "${like}" appeared in both result.strongLikes and result.strongDislikes`
    );
  }

  // Check numeric maps
  for (const fav of Object.keys(analysis.favoriteGenresMap)) {
    assert.equal(
      fav in analysis.dislikedGenresMap,
      false,
      `Genre "${fav}" in both favoriteGenresMap and dislikedGenresMap`
    );
  }
});

test("Overlapping Genres: High-rated dominant genre with 1 or 2 low ratings does NOT become a dislike", () => {
  // User loves Action (5 high ratings), but had 2 low-rated movies that happened to include Action
  const movies = [
    createMockMovie({ id: 1, movie_name: "Mad Max", genres: '["Action", "Sci-Fi"]', rating: 10 }),
    createMockMovie({ id: 2, movie_name: "John Wick", genres: '["Action", "Thriller"]', rating: 9 }),
    createMockMovie({ id: 3, movie_name: "The Dark Knight", genres: '["Action", "Crime"]', rating: 10 }),
    createMockMovie({ id: 4, movie_name: "Die Hard", genres: '["Action", "Thriller"]', rating: 8 }),
    createMockMovie({ id: 5, movie_name: "Gladiator", genres: '["Action", "Drama"]', rating: 9 }),
    // Two bad movies with Action tag
    createMockMovie({ id: 6, movie_name: "Bad Action 1", genres: '["Action", "Comedy"]', rating: 4 }),
    createMockMovie({ id: 7, movie_name: "Bad Action 2", genres: '["Action"]', rating: 3 }),
  ];

  const analysis = analyzeUserTaste(movies);
  assert.equal(analysis.strongLikes.includes("Action"), true, "Action should be in strongLikes");
  assert.equal(analysis.strongDislikes.includes("Action"), false, "Action MUST NOT be in strongDislikes");
  assert.equal("Action" in analysis.favoriteGenresMap, true, "Action must be in favoriteGenresMap");
  assert.equal("Action" in analysis.dislikedGenresMap, false, "Action must not be in dislikedGenresMap");
});

test("Mixed Preferences: Genres with ambiguous or split evidence remain Unclassified", () => {
  // Comedy has two 9s and two 3s (split reception)
  const movies = [
    createMockMovie({ id: 1, movie_name: "Comedy Win 1", genres: '["Comedy"]', rating: 9 }),
    createMockMovie({ id: 2, movie_name: "Comedy Win 2", genres: '["Comedy"]', rating: 9 }),
    createMockMovie({ id: 3, movie_name: "Comedy Fail 1", genres: '["Comedy"]', rating: 3 }),
    createMockMovie({ id: 4, movie_name: "Comedy Fail 2", genres: '["Comedy"]', rating: 3 }),
  ];

  const analysis = analyzeUserTaste(movies);
  assert.equal(analysis.strongLikes.includes("Comedy"), false, "Comedy should not be a strong like");
  assert.equal(analysis.strongDislikes.includes("Comedy"), false, "Comedy should not be a strong dislike");
  assert.equal(analysis.mixedGenres.includes("Comedy"), true, "Comedy should be classified as mixed");
  assert.equal("Comedy" in analysis.favoriteGenresMap, false);
  assert.equal("Comedy" in analysis.dislikedGenresMap, false);
});

test("Insufficient Evidence: Single rating of 8/10 does not create definitive strong affinity", () => {
  const movies = [
    createMockMovie({ id: 1, movie_name: "Random Western", genres: '["Western"]', rating: 8 }),
  ];

  const analysis = analyzeUserTaste(movies);
  assert.equal(analysis.strongLikes.includes("Western"), false, "Single 8/10 rating does not make strong affinity");
  assert.equal(analysis.strongDislikes.includes("Western"), false);
});

test("Dropped Titles: Correctly generate dislikes when decisive negative tolerance exists", () => {
  const movies = [
    createMockMovie({ id: 1, movie_name: "Good Drama", genres: '["Drama"]', rating: 9 }),
    createMockMovie({ id: 2, movie_name: "Great Drama", genres: '["Drama"]', rating: 9 }),
    createMockMovie({ id: 3, movie_name: "Boring Soap", genres: '["Soap", "Romance"]', status: "dropped", rating: 0 }),
    createMockMovie({ id: 4, movie_name: "Terrible Soap", genres: '["Soap"]', status: "dropped", rating: 0 }),
  ];

  const analysis = analyzeUserTaste(movies);
  assert.equal(analysis.strongLikes.includes("Drama"), true);
  assert.equal(analysis.strongDislikes.includes("Soap"), true, "Soap should be in strongDislikes");
  assert.equal(analysis.strongDislikes.includes("Drama"), false);
  assert.equal(analysis.strongLikes.includes("Soap"), false);
});

test("Summary Paragraph: Does not contradict itself", () => {
  const movies = [
    createMockMovie({ id: 1, movie_name: "Movie 1", genres: '["Sci-Fi", "Mystery"]', rating: 9 }),
    createMockMovie({ id: 2, movie_name: "Movie 2", genres: '["Sci-Fi", "Thriller"]', rating: 9 }),
    createMockMovie({ id: 3, movie_name: "Movie 3", genres: '["Horror"]', rating: 2 }),
    createMockMovie({ id: 4, movie_name: "Movie 4", genres: '["Horror"]', status: "dropped", rating: 0 }),
  ];

  const result = generateTasteDna(movies);
  const text = result.summaryParagraph;

  // The text should mention Sci-Fi in positive light
  assert.match(text, /affinity for Sci-Fi/i);
  // The text should mention Horror in resistance light
  assert.match(text, /Horror.*trigger clear resistance/i);

  // Sci-Fi must NOT be mentioned in resistance section
  const resistanceMatch = text.match(/trigger clear resistance/i);
  if (resistanceMatch) {
    const resistanceSection = text.slice(resistanceMatch.index - 50, resistanceMatch.index + 100);
    assert.equal(resistanceSection.includes("Sci-Fi"), false, "Sci-Fi must not appear in resistance sentence");
  }
});

