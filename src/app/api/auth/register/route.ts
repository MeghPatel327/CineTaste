import { NextResponse } from "next/server";
import { findUserByEmail, createUser } from "@/lib/baserow";
import { hashPassword, createSessionObject, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, username, preferredGenres } = body;

    if (!email || !password || !username) {
      return NextResponse.json(
        { success: false, error: "Username, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const user = await createUser(
      {
        email: email.toLowerCase().trim(),
        username: username.trim(),
        role: "user",
        preferredGenres: Array.isArray(preferredGenres) ? preferredGenres : ["Sci-Fi", "Mystery"],
      },
      passwordHash
    );

    const session = createSessionObject(user);
    await setSessionCookie(session);

    return NextResponse.json({
      success: true,
      data: { user, message: "Account created successfully." },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to register user." },
      { status: 500 }
    );
  }
}
