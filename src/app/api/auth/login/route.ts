import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/baserow";
import { verifyPassword, createSessionObject, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const record = await findUserByEmail(email);
    if (!record) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, record.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
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
      { success: false, error: err.message || "Failed to log in." },
      { status: 500 }
    );
  }
}
