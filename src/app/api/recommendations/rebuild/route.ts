import { withLogger } from "@/lib/apiWrapper";
import { NextRequest, NextResponse } from "next/server";
import { generateProfileAsync } from "@/features/recommendations/profileGenerator";
import { after } from "next/server";
import { logger } from "@/lib/logger";

export const POST = withLogger(async (req: NextRequest) => {
  try {
    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }
    
    after(() => { generateProfileAsync(username).catch((err) => logger.error({ module: "recommendations", action: "REBUILD_PROFILE", status: "FAILED", error: err })); });
    
    return NextResponse.json({ success: true, message: "Profile rebuild queued" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, "recommendations-rebuild");

