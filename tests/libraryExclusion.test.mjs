import test from "node:test";
import assert from "node:assert/strict";

// Helper replicating the exclusion logic implemented in recommendationService and browseService
function isLibraryItem(candidate, userLibrary) {
  const libraryIds = new Set(userLibrary.map((m) => Number(m.tmdb_id)));
  const libraryTitles = new Set(userLibrary.map((m) => m.movie_name.toLowerCase().trim()));
  const libraryNorm = new Set(
    userLibrary.map((m) => m.movie_name.toLowerCase().replace(/[^a-z0-9]/g, ""))
  );

  const candidateId = Number(candidate.tmdb_id ?? candidate.id);
  if (candidateId && libraryIds.has(candidateId)) return true;

  const candidateTitle = (candidate.title ?? candidate.movie_name ?? "").toLowerCase().trim();
  if (candidateTitle && libraryTitles.has(candidateTitle)) return true;

  const candidateNorm = candidateTitle.replace(/[^a-z0-9]/g, "");
  if (candidateNorm && libraryNorm.has(candidateNorm)) return true;

  return false;
}

test("Excludes by canonical TMDB ID", () => {
  const userLibrary = [
    { tmdb_id: 157336, movie_name: "Interstellar", status: "completed" },
    { tmdb_id: 1399, movie_name: "Game of Thrones", status: "watching" },
    { tmdb_id: 1535, movie_name: "Death Note", status: "on_hold" },
  ];

  assert.equal(isLibraryItem({ tmdb_id: 157336, title: "Interstellar (2014)" }, userLibrary), true);
  assert.equal(isLibraryItem({ id: 1399, title: "GoT" }, userLibrary), true);
  assert.equal(isLibraryItem({ tmdb_id: 1535, title: "Death Note" }, userLibrary), true);
  assert.equal(isLibraryItem({ tmdb_id: 999999, title: "Dune" }, userLibrary), false);
});

test("Excludes by exact title even if ID differs or is missing", () => {
  const userLibrary = [
    { tmdb_id: 100, movie_name: "Inception", status: "completed" },
  ];

  assert.equal(isLibraryItem({ id: 999, title: "Inception" }, userLibrary), true);
  assert.equal(isLibraryItem({ id: 999, title: "inception " }, userLibrary), true);
});

test("Excludes by normalized title (handling punctuation, colons, hyphens)", () => {
  const userLibrary = [
    { tmdb_id: 101, movie_name: "Spider-Man: Across the Spider-Verse", status: "watching" },
  ];

  assert.equal(isLibraryItem({ id: 999, title: "Spider-Man Across the Spider-Verse" }, userLibrary), true);
  assert.equal(isLibraryItem({ id: 999, title: "Spiderman Across The Spiderverse" }, userLibrary), true);
  assert.equal(isLibraryItem({ id: 999, title: "Spider-Man: Into the Spider-Verse" }, userLibrary), false);
});

test("Permits fresh candidates not in library", () => {
  const userLibrary = [
    { tmdb_id: 100, movie_name: "Inception", status: "completed" },
    { tmdb_id: 200, movie_name: "Breaking Bad", status: "watching" },
  ];

  assert.equal(isLibraryItem({ id: 300, title: "Better Call Saul" }, userLibrary), false);
  assert.equal(isLibraryItem({ id: 400, title: "Shutter Island" }, userLibrary), false);
});

