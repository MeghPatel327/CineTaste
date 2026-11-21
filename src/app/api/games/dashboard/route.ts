import { NextRequest } from "next/server";
import { withLogger } from "@/lib/apiWrapper";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getGameDashboardStatsService } from "@/features/games/gameService";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const stats = await getGameDashboardStatsService(session.username);
    return successResponse(stats);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "games-dashboard");

