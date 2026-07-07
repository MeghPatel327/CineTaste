import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

const SECRET_KEY = new TextEncoder().encode(env.AUTH_SECRET);
const SESSION_COOKIE = "cinetaste_session";

export interface SessionPayload {
  userId: number;
  username: string;
  role: "user" | "admin";
  expiresAt: Date;
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(SECRET_KEY);
}

export async function decrypt(session: string | undefined = "") {
  try {
    if (!session) return null;
    const { payload } = await jwtVerify(session, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function createSession(userId: number, username: string, role: "user" | "admin") {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await encrypt({ userId, username, role, expiresAt });

  (await cookies()).set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
