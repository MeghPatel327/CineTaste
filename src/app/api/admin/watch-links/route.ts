import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { addWatchOptionForMedia, getWatchOptionsForMedia, getAllBundledMedia } from "@/lib/baserow";

export async function GET() {
  const session = await getCurrentSession();
  const config = getServerEnv();

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  if (session.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Forbidden. Admin privileges required." },
      { status: 403 }
    );
  }

  const catalog = getAllBundledMedia();
  const allLinks = await Promise.all(
    catalog.map(async (item) => ({
      tmdbId: item.id,
      title: item.title,
      watchOptions: await getWatchOptionsForMedia(item.id),
    }))
  );

  return NextResponse.json({ success: true, data: allLinks });
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    const config = getServerEnv();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { tmdbId, providerId, providerName, directUrl, qualityLabel, badgeLabel, languageAudio } = body;

    if (!tmdbId || !directUrl) {
      return NextResponse.json(
        { success: false, error: "tmdbId and directUrl are required." },
        { status: 400 }
      );
    }

    const newLink = await addWatchOptionForMedia(tmdbId, {
      providerId: providerId || "prov_custom",
      providerName: providerName || "External Stream",
      providerType: "external_catalog",
      directUrl,
      qualityLabel: qualityLabel || "1080p FHD",
      badgeLabel: badgeLabel || "Community Link",
      languageAudio: languageAudio || "English",
      isVerified: true,
    });

    return NextResponse.json({ success: true, data: newLink });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to add watch link." },
      { status: 500 }
    );
  }
}
