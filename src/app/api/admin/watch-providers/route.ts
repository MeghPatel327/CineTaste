import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import {
  getGlobalWatchProviders,
  createGlobalWatchProvider,
  updateGlobalWatchProvider,
  deleteGlobalWatchProvider,
} from "@/lib/baserow";

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url.replace(/\{q\}|\{query\}/g, "test"));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  const session = await getCurrentSession();
  const config = getServerEnv();

  // Allow non-admins to fetch enabled providers or admins to fetch all
  const providers = await getGlobalWatchProviders();
  const isAdmin = session?.role === "admin" || config.isDevMockMode;

  if (!isAdmin) {
    // Regular users see only active providers
    return NextResponse.json({
      success: true,
      data: providers.filter((p) => p.isActive),
    });
  }

  return NextResponse.json({ success: true, data: providers });
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    const config = getServerEnv();

    if (session?.role !== "admin" && !config.isDevMockMode) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Administrator role required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { providerName, baseUrl, displayOrder, isActive } = body;

    if (!providerName || !baseUrl) {
      return NextResponse.json(
        { success: false, error: "providerName and baseUrl are required." },
        { status: 400 }
      );
    }

    if (!validateUrl(baseUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid URL. Only HTTP and HTTPS protocols are permitted." },
        { status: 400 }
      );
    }

    const res = await createGlobalWatchProvider({
      providerName,
      baseUrl,
      displayOrder: typeof displayOrder === "number" ? displayOrder : 99,
      isActive: isActive !== false,
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: res.data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create provider." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getCurrentSession();
    const config = getServerEnv();

    if (session?.role !== "admin" && !config.isDevMockMode) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Administrator role required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, providerName, baseUrl, displayOrder, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Provider row id is required." },
        { status: 400 }
      );
    }

    if (baseUrl && !validateUrl(baseUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid URL. Only HTTP and HTTPS protocols are permitted." },
        { status: 400 }
      );
    }

    const res = await updateGlobalWatchProvider(id, {
      providerName,
      baseUrl,
      displayOrder,
      isActive,
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: res.data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update provider." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getCurrentSession();
    const config = getServerEnv();

    if (session?.role !== "admin" && !config.isDevMockMode) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Administrator role required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Provider row id is required." },
        { status: 400 }
      );
    }

    const res = await deleteGlobalWatchProvider(id);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete provider." },
      { status: 500 }
    );
  }
}
