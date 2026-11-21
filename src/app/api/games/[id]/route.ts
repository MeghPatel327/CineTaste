import { NextRequest } from "next/server";
import { withLogger } from "@/lib/apiWrapper";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getGameDetailsService } from "@/features/games/gameService";

export const GET = withLogger(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const params = await context.params;
    const gameId = parseInt(params.id, 10);
    if (isNaN(gameId)) return errorResponse("Invalid Game ID", 400, "BAD_REQUEST");

    try {
      const details = await getGameDetailsService(session.username, gameId);
      if (!details) return errorResponse("Game not found", 404, "NOT_FOUND");
      return successResponse(details);
    } catch (error: any) {
      return handleApiError(error);
    }
  },
  "games-details"
);
