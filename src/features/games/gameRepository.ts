import { baserowCreate, baserowDelete, baserowGetAll, baserowUpdate } from "@/lib/baserow";
import { env } from "@/lib/env";

/**
 * Dedicated GameRow for the BASEROW_GAMES_TABLE_ID table.
 * Fields are game-specific — no dual-use with MovieRow.
 *
 * Baserow schema for the games table:
 *   username        (text)
 *   game_name       (text)
 *   status          (text: playing|completed|pending|on_hold|dropped)
 *   rating          (number, 0-10)
 *   personal_review (long text)
 *   watch_order_rank (number, nullable)
 *   rawg_id         (number)  — canonical RAWG game ID
 *   genres          (long text, JSON array string)
 *   platforms       (long text, JSON array string)
 *   release_year    (number)
 *   playtime_hours  (number)
 *   cover_url       (url/text)
 *   backdrop_url    (url/text)
 *   summary         (long text)
 *   created_at      (text ISO-8601)
 *   updated_at      (text ISO-8601)
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
 * Separate pirate/streaming site for games.
 * Stored in BASEROW_GAME_PIRATES_TABLE_ID table.
 *
 * Baserow schema:
 *   name       (text)       — display name e.g. "GOG", "Epic Games Store"
 *   search_url (url/text)   — URL template with {q} placeholder
 *   enabled    (boolean)
 */
export interface GamePirateSiteRow {
  id: number;
  name: string;
  search_url: string;
  enabled: boolean;
}

function getGamesTableId(): string {
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

export async function getGamePirateSites(): Promise<GamePirateSiteRow[]> {
  const tableId = getGamePiratesTableId();
  return baserowGetAll<GamePirateSiteRow>(tableId);
}

export async function addGamePirateSite(
  data: Omit<GamePirateSiteRow, "id">
): Promise<GamePirateSiteRow> {
  const tableId = getGamePiratesTableId();
  return baserowCreate<GamePirateSiteRow>(tableId, data);
}

export async function updateGamePirateSite(
  id: number,
  data: Partial<Omit<GamePirateSiteRow, "id">>
): Promise<GamePirateSiteRow> {
  const tableId = getGamePiratesTableId();
  return baserowUpdate<GamePirateSiteRow>(tableId, id, data);
}

export async function deleteGamePirateSite(id: number): Promise<void> {
  const tableId = getGamePiratesTableId();
  return baserowDelete(tableId, id);
}
