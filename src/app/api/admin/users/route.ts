import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  if (session.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Forbidden. Admin privileges required." },
      { status: 403 }
    );
  }

  // Active user directory for administrators
  const users = [
    {
      id: "usr_megh_admin",
      email: "megh@cinetaste.local",
      username: "Megh",
      role: "admin",
      preferredGenres: ["Sci-Fi", "Mystery", "Drama"],
      createdAt: "2026-10-10T00:00:00Z",
    },
    {
      id: "usr_parth_user",
      email: "parth@cinetaste.local",
      username: "Parth",
      role: "user",
      preferredGenres: ["Action", "Sci-Fi", "Thriller"],
      createdAt: "2026-10-10T00:00:00Z",
    },
  ];

  return NextResponse.json({ success: true, data: users });
}
