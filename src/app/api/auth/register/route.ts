import { NextResponse } from "next/server";
import { findUserByUsername, createUser } from "@/lib/baserow";
import { hashPassword, createSessionObject, setSessionCookie } from "@/lib/auth";

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,30}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, confirmPassword } = body;

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      return NextResponse.json(
        {
          success: false,
          error: "Username must be between 3 and 30 characters (letters, numbers, underscores, hyphens, and dots only).",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match." },
        { status: 400 }
      );
    }

    // Query Baserow to check for duplicate username
    let existing = null;
    try {
      existing = await findUserByUsername(trimmedUsername);
    } catch (baserowErr: any) {
      return NextResponse.json(
        { success: false, error: "Registration service unavailable. Please try again later." },
        { status: 503 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Username is already taken." },
        { status: 409 }
      );
    }

    // Hash password with PBKDF2
    const passwordHash = hashPassword(password);

    // Create user in Baserow with role strictly "user"
    const createResult = await createUser(
      {
        username: trimmedUsername,
        role: "user",
      },
      passwordHash
    );

    if (!createResult.success || !createResult.data) {
      return NextResponse.json(
        { success: false, error: createResult.error || "Failed to create user in database." },
        { status: 503 }
      );
    }

    const user = createResult.data;
    const session = createSessionObject(user);
    await setSessionCookie(session);

    return NextResponse.json({
      success: true,
      data: { user, message: "Account created successfully." },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
