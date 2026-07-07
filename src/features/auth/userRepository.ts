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

export async function getUserById(id: number): Promise<UserRow | null> {
  // Using fetch directly as baserowGet by ID isn't wrapped
  const url = `${env.BASEROW_API_URL}/api/database/rows/table/${env.BASEROW_USERS_TABLE_ID}/${id}/?user_field_names=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Token ${env.BASEROW_API_TOKEN}`, "Content-Type": "application/json" }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function updateUserPassword(id: number, password_hash: string): Promise<UserRow> {
  return baserowUpdate<UserRow>(env.BASEROW_USERS_TABLE_ID, id, {
    password_hash,
  });
}
