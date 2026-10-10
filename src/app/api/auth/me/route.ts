import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { findUserById } from "@/lib/baserow";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    // Provide active demo session for seamless preview if unauthenticated
    return NextResponse.json({
      success: true,
      data: {
        isAuthenticated: false,
        user: {
          id: "usr_cinetaste_demo",
          email: "cinephile@cinetaste.local",
          username: "Guest Cinephile",
          role: "user",
          preferredGenres: ["Sci-Fi", "Neo-Noir", "Mystery"],
          createdAt: new Date().toISOString(),
        },
      },
    });
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
