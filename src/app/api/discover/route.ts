import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({ message: "Discover route is deprecated. Use /api/browse." }, { status: 410 });
}
