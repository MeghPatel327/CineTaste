import { NextResponse } from "next/server";
import { findUserByUsername } from "@/lib/baserow";
import { verifyPassword, createSessionObject, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    let record = null;
    try {
      record = await findUserByUsername(trimmedUsername);
    } catch (baserowErr: any) {
      return NextResponse.json(
        { success: false, error: "Authentication service unavailable. Please try again later." },
        { status: 503 }
      );
    }

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, record.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const session = createSessionObject(record.profile);
    await setSessionCookie(session);

    return NextResponse.json({
      success: true,
      data: { user: record.profile, message: "Logged in successfully." },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
