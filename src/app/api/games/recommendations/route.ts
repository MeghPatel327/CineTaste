import { NextRequest } from "next/server";
import { withLogger } from "@/lib/apiWrapper";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getGameRecommendationsService } from "@/features/games/gameService";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const searchParams = req.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "12", 10);
  const forceRefresh = searchParams.get("refresh") === "true";

  try {
    const recommendations = await getGameRecommendationsService(session.username, {
      limit,
      forceRefresh,
    });
    return successResponse(recommendations);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "games-recommendations");
