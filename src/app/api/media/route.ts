import { NextResponse } from "next/server";
import { getAllBundledMedia } from "@/lib/baserow";
import { searchMedia } from "@/lib/tmdb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const genre = searchParams.get("genre") || "";
    const type = searchParams.get("type") || "";

    if (query.trim()) {
      const results = await searchMedia(query);
      return NextResponse.json({ success: true, data: results });
    }

    let items = getAllBundledMedia();

    if (genre && genre !== "All") {
      items = items.filter((m) =>
        m.genres.some((g) => g.toLowerCase() === genre.toLowerCase())
      );
    }

    if (type) {
      items = items.filter((m) => m.mediaType === type);
    }

    return NextResponse.json({ success: true, data: items });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch media catalog." },
      { status: 500 }
    );
  }
}
