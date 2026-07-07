import { baserowGet, baserowCreate, baserowUpdate } from "@/lib/baserow";
import { env } from "@/lib/env";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: "user" | "admin";
  blocked: boolean;
  created_at: string;
  last_login: string | null;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const response = await baserowGet<UserRow>(env.BASEROW_USERS_TABLE_ID, {
    search: username,
  });
  return response.results.find((u) => u.username === username) || null;
}

export async function createUser(data: Omit<UserRow, "id">): Promise<UserRow> {
  return baserowCreate<UserRow>(env.BASEROW_USERS_TABLE_ID, data);
}

export async function updateUserLastLogin(id: number): Promise<UserRow> {
  return baserowUpdate<UserRow>(env.BASEROW_USERS_TABLE_ID, id, {
    last_login: new Date().toISOString(),
  });
}
