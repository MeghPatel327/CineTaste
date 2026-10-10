import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getPersonalizedRecommendations } from "@/lib/recommendations";

export async function GET() {
  try {
    const session = await getCurrentSession();
    const userId = session?.userId || "usr_cinetaste_demo";

    const result = await getPersonalizedRecommendations(userId, false);
    return NextResponse.json({
      success: true,
      data: result.items,
      meta: { engine: result.engineUsed },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate recommendations." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getCurrentSession();
    const userId = session?.userId || "usr_cinetaste_demo";

    const result = await getPersonalizedRecommendations(userId, true);
    return NextResponse.json({
      success: true,
      data: result.items,
      meta: { engine: result.engineUsed, refreshed: true },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to refresh recommendations." },
      { status: 500 }
    );
  }
}
