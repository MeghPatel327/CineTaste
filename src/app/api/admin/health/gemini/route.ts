import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { checkFullSystemHealth, checkGeminiHealth } from "@/features/admin/geminiHealthService";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return errorResponse("Forbidden", 403, "FORBIDDEN");
  }

  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";
    const full = searchParams.get("full") === "true";

    if (full) {
      const data = await checkFullSystemHealth({ force });
      return successResponse(data);
    }

    const data = await checkGeminiHealth({ force });
    return successResponse(data);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "admin-gemini-health");

export const POST = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return errorResponse("Forbidden", 403, "FORBIDDEN");
  }

  try {
    let force = true;
    let full = false;
    try {
      const body = await req.json();
      if (typeof body?.force === "boolean") force = body.force;
      if (typeof body?.full === "boolean") full = body.full;
    } catch {
      // Body is optional
    }

    if (full) {
      const data = await checkFullSystemHealth({ force });
      return successResponse(data);
    }

    const data = await checkGeminiHealth({ force });
    return successResponse(data);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "admin-gemini-health-check");
