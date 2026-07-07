import { z } from "zod";
import { getAllUsers, updateUserAdmin, getPirateSites, addPirateSite, updatePirateSite, deletePirateSite } from "./adminRepository";
import { ApiError } from "@/lib/ApiError";

const updateUserSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  blocked: z.boolean().optional(),
});

const addSiteSchema = z.object({
  name: z.string().min(1),
  search_url: z.string().min(1),
  enabled: z.boolean(),
});

const updateSiteSchema = z.object({
  name: z.string().min(1).optional(),
  search_url: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

export async function getAllUsersService() {
  const users = await getAllUsers();
  return users.map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    blocked: u.blocked,
    created_at: u.created_at,
    last_login: u.last_login
  }));
}

export async function updateUserService(id: number, body: any) {
  const result = updateUserSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation error");
  }

  const updatedUser = await updateUserAdmin(id, result.data);
  return {
    id: updatedUser.id,
    username: updatedUser.username,
    role: updatedUser.role,
    blocked: updatedUser.blocked
  };
}

export async function getPirateSitesService() {
  return await getPirateSites();
}

export async function addPirateSiteService(body: any) {
  const result = addSiteSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation error");
  }
  return await addPirateSite(result.data);
}

export async function updatePirateSiteService(id: number, body: any) {
  const result = updateSiteSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation error");
  }
  return await updatePirateSite(id, result.data);
}

export async function deletePirateSiteService(id: number) {
  await deletePirateSite(id);
}
