import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserMediaRecords, upsertUserMediaRecord, getAllBundledMedia, getWatchOptionsForMedia } from "@/lib/baserow";

export async function GET() {
  try {
    const session = await getCurrentSession();
    const userId = session?.userId || "usr_cinetaste_demo";

    const records = await getUserMediaRecords(userId);
    const queueRecords = records.filter((r) => r.isInQueue);

    const catalog = getAllBundledMedia();
    const catalogMap = new Map(catalog.map((m) => [m.id, m]));

    const queueItems = await Promise.all(
      queueRecords.map(async (r) => {
        const item = catalogMap.get(r.tmdbId) || {
          id: r.tmdbId,
          title: r.tmdbId,
          overview: "In your private cinema queue",
          backdropUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=2000&q=85",
          posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
          releaseYear: 2024,
          rating: 8.5,
          genres: ["Sci-Fi"],
          mediaType: "movie" as const,
        };

        const watchOptions = await getWatchOptionsForMedia(r.tmdbId);
        return {
          ...item,
          watchProgress: r.watchProgress,
          userRecord: r,
          watchOptions,
        };
      })
    );

    return NextResponse.json({ success: true, data: queueItems });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch queue." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    const userId = session?.userId || "usr_cinetaste_demo";

    const body = await req.json();
    const { tmdbId, inQueue } = body;

    if (!tmdbId) {
      return NextResponse.json(
        { success: false, error: "tmdbId is required." },
        { status: 400 }
      );
    }

    const updated = await upsertUserMediaRecord(userId, tmdbId, {
      isInQueue: Boolean(inQueue),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update queue." },
      { status: 500 }
    );
  }
}
