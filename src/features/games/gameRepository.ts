import { baserowCreate, baserowDelete, baserowGetAll, baserowUpdate } from "@/lib/baserow";
import { env } from "@/lib/env";
import type { MovieRow } from "@/features/movies/movieRepository";

export interface GameRow extends MovieRow {
  type: "game";
}

/**
 * Returns the effective Baserow table ID for games.
 * Defaults to BASEROW_MOVIES_TABLE_ID so zero extra schema setup is strictly required.
 */
function getGamesTableId(): string {
  return env.BASEROW_GAMES_TABLE_ID || env.BASEROW_MOVIES_TABLE_ID;
}

export async function getUserGames(username: string): Promise<MovieRow[]> {
  const tableId = getGamesTableId();
  const results = await baserowGetAll<MovieRow>(tableId, {
    search: username,
  });

  return results.filter((m) => m.username === username && m.type === "game");
}

export async function addGame(data: Omit<MovieRow, "id" | "created_at" | "updated_at">): Promise<MovieRow> {
  const tableId = getGamesTableId();
  const now = new Date().toISOString();
  return baserowCreate<MovieRow>(tableId, {
    ...data,
    type: "game",
    created_at: now,
    updated_at: now,
  });
}

export async function updateGame(
  id: number,
  data: Partial<Omit<MovieRow, "id" | "created_at" | "username">>
): Promise<MovieRow> {
  const tableId = getGamesTableId();
  const now = new Date().toISOString();
  return baserowUpdate<MovieRow>(tableId, id, {
    ...data,
    updated_at: now,
  });
}

export async function deleteGame(id: number): Promise<void> {
  const tableId = getGamesTableId();
  return baserowDelete(tableId, id);
}
