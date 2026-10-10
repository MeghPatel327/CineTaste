import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { findUserById } from "@/lib/baserow";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await findUserById(session.userId);
  return NextResponse.json({
    success: true,
    data: {
      isAuthenticated: true,
      user: user || {
        id: session.userId,
        email: session.email,
        username: session.username,
        role: session.role,
        preferredGenres: ["Sci-Fi", "Mystery"],
        createdAt: new Date().toISOString(),
      },
    },
  });
}
