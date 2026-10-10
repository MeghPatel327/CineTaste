import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserMediaRecords, upsertUserMediaRecord, getAllBundledMedia, getWatchOptionsForMedia } from "@/lib/baserow";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }
    const userId = session.userId;

    const records = await getUserMediaRecords(userId);
    const catalog = getAllBundledMedia();
    const catalogMap = new Map(catalog.map((m) => [m.id, m]));

    // Join with catalog details
    const libraryItems = await Promise.all(
      records.map(async (r) => {
        const item = catalogMap.get(r.tmdbId) || {
          id: r.tmdbId,
          title: r.tmdbId,
          overview: "User-saved catalog title",
          backdropUrl: "https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
          posterUrl: "https://image.tmdb.org/t/p/w500/wwemzKWzjKYJFfCeiB57q3r4Bcm.png",
          releaseYear: 2024,
          rating: 8.0,
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

    return NextResponse.json({ success: true, data: libraryItems });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch user library." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }
    const userId = session.userId;

    const body = await req.json();
    const { tmdbId, libraryStatus, isInQueue, isFavorite, userRating, watchProgress, isExcluded, notes } = body;

    if (!tmdbId) {
      return NextResponse.json(
        { success: false, error: "tmdbId is required." },
        { status: 400 }
      );
    }

    const updated = await upsertUserMediaRecord(userId, tmdbId, {
      libraryStatus,
      isInQueue,
      isFavorite,
      userRating,
      watchProgress,
      isExcluded,
      notes,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update library." },
      { status: 500 }
    );
  }
}
