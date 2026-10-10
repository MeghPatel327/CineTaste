import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserProfileStats } from "@/lib/stats";

export async function GET() {
  try {
    const session = await getCurrentSession();
    const userId = session?.userId || "usr_cinetaste_demo";

    const stats = await getUserProfileStats(userId);
    return NextResponse.json({ success: true, data: stats });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to calculate profile stats." },
      { status: 500 }
    );
  }
}
