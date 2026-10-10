import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { listAllUsers } from "@/lib/baserow";

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

  const users = await listAllUsers();
  return NextResponse.json({ success: true, data: users });
}
