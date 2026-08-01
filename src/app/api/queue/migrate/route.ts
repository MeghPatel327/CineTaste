import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { migrateQueueData } from "@/features/movies/queueService";

/**
 * POST /api/queue/migrate
 * Migrates existing queue data to ensure all pending movies have unique sequential ranks
 * and completed/dropped movies have NULL ranks
 * 
 * This should be called once when the feature is introduced
 */
export const POST = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const result = await migrateQueueData(session.username);
    return successResponse(result, "Queue data migrated successfully");
  } catch (error: any) {
    return handleApiError(error);
  }
}, "queue-migrate");
