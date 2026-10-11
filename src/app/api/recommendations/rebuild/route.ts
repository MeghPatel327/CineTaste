import { withLogger } from "@/lib/apiWrapper";
import { NextRequest, NextResponse } from "next/server";
import { generateProfileAsync } from "@/features/recommendations/profileGenerator";
import {
  invalidateRecommendations,
  getRecommendations,
} from "@/features/recommendations/recommendationService";
import { after } from "next/server";
import { logger } from "@/lib/logger";

export const POST = withLogger(async (req: NextRequest) => {
  try {
    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    after(async () => {
      try {
        await generateProfileAsync(username);
        await invalidateRecommendations(username);
        // Pre-warm the fresh recommendation set in background
        await getRecommendations(username, { forceRefresh: true });
      } catch (err) {
        logger.error({
          module: "recommendations",
          action: "REBUILD_PROFILE_AND_RECOMMENDATIONS",
          status: "FAILED",
          error: err,
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Profile and recommendation rebuild queued",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, "recommendations-rebuild");
