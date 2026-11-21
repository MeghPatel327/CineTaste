/**
 * Game Storage Architecture — Two Dedicated Tables
 * =================================================
 * 
 * This module enforces strict separation between game data and movie/series/anime data.
 * 
 * **Table A — User Library Data** (`BASEROW_GAMES_TABLE_ID`)
 * - Stores user-owned/tracked game entries
 * - Fields: username, game_name, status, rating, personal_review, watch_order_rank, 
 *   rawg_id, genres, platforms, release_year, playtime_hours, cover_url, backdrop_url, 
 *   summary, created_at, updated_at
 * - NEVER mix with `BASEROW_MOVIES_TABLE_ID` or any movie-related data
 * 
 * **Table B — Pirated Games Site** (`BASEROW_GAME_PIRATES_TABLE_ID`)
 * - Stores game streaming/download site entries
 * - Fields: name, search_url, enabled
 * - COMPLETELY SEPARATE from `BASEROW_PIRATES_TABLE_ID` (movie sites)
 * - Never returned by movie routes; never mixed with movie pirate sites
 * 
 * Status values (stored as plain text, NOT single-select):
 * - `playing` = Currently playing
 * - `completed` = Finished
 * - `pending` = Backlog / plan to play
 * - `on_hold` = Paused
 * - `dropped` = Abandoned
 * 
 * IMPORTANT: The movies table stores status `watching` for in-progress content,
 * while the games table stores `playing`. These are NOT interchangeable.
 */

import { baserowCreate, baserowDelete, baserowGetAll, baserowUpdate } from "@/lib/baserow";
import { env } from "@/lib/env";

/**
 * Game library row stored in Baserow (BASEROW_GAMES_TABLE_ID).
 * This type is NEVER used in any movie/series/anime context.
 */
export interface GameRow {
  id: number;
  username: string;
  game_name: string;
  status: "playing" | "completed" | "pending" | "on_hold" | "dropped";
  rating: number;
  personal_review: string;
  watch_order_rank: number | null;
  rawg_id: number;
  genres: string; // JSON array string e.g. '["RPG","Adventure"]'
  platforms: string; // JSON array string e.g. '["PC","PS5"]'
  release_year: number;
  playtime_hours: number;
  cover_url: string;
  backdrop_url: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

/**
 * Game streaming/download site entry (BASEROW_GAME_PIRATES_TABLE_ID).
 * COMPLETELY SEPARATE from PirateSiteRow used for movies/series/anime.
 */
export interface GamePirateSiteRow {
  id: number;
  name: string;
  search_url: string;
  enabled: boolean;
}

/**
 * Get the games table ID with clear error message if not configured.
 * Throws explicit error to prevent silent fallback to movies table.
 */
export function getGamesTableId(): string {
  if (!env.BASEROW_GAMES_TABLE_ID) {
    throw new Error(
      "BASEROW_GAMES_TABLE_ID is not configured. " +
        "Create a dedicated games table in Baserow and set this env var."
    );
  }
  return env.BASEROW_GAMES_TABLE_ID;
}

function getGamePiratesTableId(): string {
  if (!env.BASEROW_GAME_PIRATES_TABLE_ID) {
    throw new Error(
      "BASEROW_GAME_PIRATES_TABLE_ID is not configured. " +
        "Create a dedicated game streaming/sites table in Baserow and set this env var."
    );
  }
  return env.BASEROW_GAME_PIRATES_TABLE_ID;
}

// ─── Game Library CRUD ───────────────────────────────────────────────────────

export async function getUserGames(username: string): Promise<GameRow[]> {
  const tableId = getGamesTableId();
  const results = await baserowGetAll<GameRow>(tableId, { search: username });
  return results.filter((g) => g.username === username);
}

export async function addGame(
  data: Omit<GameRow, "id" | "created_at" | "updated_at">
): Promise<GameRow> {
  const tableId = getGamesTableId();
  const now = new Date().toISOString();
  return baserowCreate<GameRow>(tableId, {
    ...data,
    created_at: now,
    updated_at: now,
  });
}

export async function updateGame(
  id: number,
  data: Partial<Omit<GameRow, "id" | "created_at" | "username">>
): Promise<GameRow> {
  const tableId = getGamesTableId();
  const now = new Date().toISOString();
  return baserowUpdate<GameRow>(tableId, id, { ...data, updated_at: now });
}

export async function deleteGame(id: number): Promise<void> {
  const tableId = getGamesTableId();
  return baserowDelete(tableId, id);
}

// ─── Game Pirate / Streaming Sites CRUD ─────────────────────────────────────

/**
 * Fetch game streaming/download sites from the dedicated game pirate sites table.
 * COMPLETELY SEPARATE from movie pirate_sites. Returns empty array if not configured.
 */
export async function getGamePirateSites(): Promise<GamePirateSiteRow[]> {
  const tableId = getGamePiratesTableId();
  if (!tableId) return []; // Graceful: no game sites configured
  return baserowGetAll<GamePirateSiteRow>(tableId);
}

export async function addGamePirateSite(
  data: Omit<GamePirateSiteRow, "id">
): Promise<GamePirateSiteRow> {
  const tableId = getGamePiratesTableId();
  if (!tableId) {
    throw new Error("BASEROW_GAME_PIRATES_TABLE_ID is not configured");
  }
  return baserowCreate<GamePirateSiteRow>(tableId, data);
}

export async function updateGamePirateSite(
  id: number,
  data: Partial<Omit<GamePirateSiteRow, "id">>
): Promise<GamePirateSiteRow> {
  const tableId = getGamePiratesTableId();
  if (!tableId) {
    throw new Error("BASEROW_GAME_PIRATES_TABLE_ID is not configured");
  }
  return baserowUpdate<GamePirateSiteRow>(tableId, id, data);
}

export async function deleteGamePirateSite(id: number): Promise<void> {
  const tableId = getGamePiratesTableId();
  if (!tableId) {
    return;
  }
  return baserowDelete(tableId, id);
}
