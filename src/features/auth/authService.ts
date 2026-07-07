import { z } from "zod";
import bcrypt from "bcryptjs";
import { findUserByUsername, createUser, updateUserLastLogin, getUserById, updateUserPassword, UserRow } from "./userRepository";
import { createSession } from "@/lib/session";
import { ApiError } from "@/lib/ApiError";

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6),
});

export async function registerUser(body: any) {
  const result = registerSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation error");
  }

  const { username, password } = result.data;

  const existingUser = await findUserByUsername(username);
  if (existingUser) {
    throw new ApiError(409, "USERNAME_EXISTS", "Username already exists");
  }

  const password_hash = await bcrypt.hash(password, 10);
  const created_at = new Date().toISOString();

  const newUser = await createUser({
    username,
    password_hash,
    role: "user",
    blocked: false,
    created_at,
    last_login: null,
  });

  return { id: newUser.id, username: newUser.username, role: newUser.role };
}

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export async function loginUser(body: any) {
  const result = loginSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation error");
  }

  const { username, password } = result.data;
  const user = await findUserByUsername(username);

  if (!user) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid username or password");
  }

  if (user.blocked) {
    throw new ApiError(403, "ACCOUNT_BLOCKED", "Account is blocked");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid username or password");
  }

  await updateUserLastLogin(user.id);
  await createSession(user.id, user.username, user.role);

  return { id: user.id, username: user.username, role: user.role };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function changePassword(userId: number, body: any) {
  const result = changePasswordSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation error");
  }

  const { currentPassword, newPassword } = result.data;
  const user = await getUserById(userId);

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect current password");
  }

  const new_password_hash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(userId, new_password_hash);

  return { success: true };
}
