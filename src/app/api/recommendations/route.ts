import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import {
  getRecommendations,
  toLegacyFormat,
} from "@/features/recommendations/recommendationService";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { searchParams } = new URL(req.url);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = parseInt(searchParams.get("limit") ?? "0", 10);
    const forceRefresh = searchParams.get("refresh") === "true";

    const options = {
      ...(limit > 0 ? { offset, limit } : {}),
      forceRefresh,
    };

    const recommendations = await getRecommendations(session.username, options);
    return successResponse(toLegacyFormat(recommendations));
  } catch (error: any) {
    return handleApiError(error);
  }
}, "recommendations");
