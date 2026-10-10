import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";

export async function GET() {
  const session = await getCurrentSession();
  const config = getServerEnv();

  if (session?.role !== "admin" && !config.isDevMockMode) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Admin privileges required." },
      { status: 403 }
    );
  }

  // Sample or active user list for administration
  const users = [
    {
      id: "usr_cinetaste_demo",
      email: "cinephile@cinetaste.local",
      username: "Deckard_Blade",
      role: "admin",
      preferredGenres: ["Sci-Fi", "Neo-Noir", "Mystery"],
      createdAt: "2026-01-15T00:00:00Z",
    },
    {
      id: "usr_community_1",
      email: "curator@cinetaste.local",
      username: "CinemaCurator",
      role: "user",
      preferredGenres: ["Drama", "History"],
      createdAt: "2026-02-01T00:00:00Z",
    },
  ];

  return NextResponse.json({ success: true, data: users });
}
