import { NextRequest } from "next/server";
import { withLogger } from "@/lib/apiWrapper";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getGamePirateSites } from "@/features/games/gameRepository";

export const GET = withLogger(async (req: NextRequest) => {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const sites = await getGamePirateSites();
    const enabledSites = sites.filter((s) => s.enabled);
    return successResponse(enabledSites);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "game-pirate-sites");

