import { baserowGet, baserowCreate, baserowUpdate, baserowDelete } from "@/lib/baserow";
import { env } from "@/lib/env";
import { UserRow } from "@/features/auth/userRepository";

export interface PirateSiteRow {
  id: number;
  name: string;
  search_url: string;
  enabled: boolean;
}

// User Admin Operations
export async function getAllUsers(): Promise<UserRow[]> {
  const response = await baserowGet<UserRow>(env.BASEROW_USERS_TABLE_ID);
  return response.results;
}

export async function updateUserAdmin(id: number, data: Partial<UserRow>): Promise<UserRow> {
  return baserowUpdate<UserRow>(env.BASEROW_USERS_TABLE_ID, id, data);
}

// Pirate Site Operations
export async function getPirateSites(): Promise<PirateSiteRow[]> {
  const response = await baserowGet<PirateSiteRow>(env.BASEROW_PIRATES_TABLE_ID);
  return response.results;
}

export async function addPirateSite(data: Omit<PirateSiteRow, "id">): Promise<PirateSiteRow> {
  return baserowCreate<PirateSiteRow>(env.BASEROW_PIRATES_TABLE_ID, data);
}

export async function updatePirateSite(id: number, data: Partial<PirateSiteRow>): Promise<PirateSiteRow> {
  return baserowUpdate<PirateSiteRow>(env.BASEROW_PIRATES_TABLE_ID, id, data);
}

export async function deletePirateSite(id: number): Promise<void> {
  return baserowDelete(env.BASEROW_PIRATES_TABLE_ID, id);
}
