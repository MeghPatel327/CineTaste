import { withLogger } from "@/lib/apiWrapper";
import { NextRequest, NextResponse } from "next/server";
import { generateProfileAsync } from "@/features/recommendations/profileGenerator";

export const POST = withLogger(async (req: NextRequest) => {
  try {
    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }
    
    // Trigger in the background without blocking the response
    // Promise.resolve().then() is generally enough, but in Vercel we should ideally use waitUntil.
    // However, since we are doing standard server-side processing, we can simply kick it off:
    
    Promise.resolve().then(() => generateProfileAsync(username)).catch(console.error);
    
    return NextResponse.json({ success: true, message: "Profile rebuild queued" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, "recommendations-rebuild");
