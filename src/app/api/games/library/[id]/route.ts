import { NextRequest } from "next/server";
import { withLogger } from "@/lib/apiWrapper";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { updateGameLibraryItemService, removeGameFromLibraryService } from "@/features/games/gameService";

export const PATCH = withLogger(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse("Invalid ID", 400, "BAD_REQUEST");

    try {
      const body = await req.json();
      const updated = await updateGameLibraryItemService(session.username, id, body);
      return successResponse(updated, "Game updated successfully");
    } catch (error: any) {
      return handleApiError(error);
    }
  },
  "games-library-update"
);

export const DELETE = withLogger(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse("Invalid ID", 400, "BAD_REQUEST");

    try {
      await removeGameFromLibraryService(session.username, id);
      return successResponse({ id }, "Game removed from library");
    } catch (error: any) {
      return handleApiError(error);
    }
  },
  "games-library-delete"
);
