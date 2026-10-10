import { NextResponse } from "next/server";
import { getAllBundledMedia, getWatchOptionsForMedia } from "@/lib/baserow";
import { fetchTmdbMedia } from "@/lib/tmdb";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bundled = getAllBundledMedia().find((m) => m.id === id || m.tmdbId === id);

    let item = bundled;
    if (!item) {
      item = (await fetchTmdbMedia(id)) || undefined;
    }

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Media item not found." },
        { status: 404 }
      );
    }

    // Attach configured external watch options from Baserow
    const watchOptions = await getWatchOptionsForMedia(item.id, item.title);

    return NextResponse.json({
      success: true,
      data: {
        ...item,
        watchOptions,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch media details." },
      { status: 500 }
    );
  }
}
