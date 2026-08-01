import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getPendingQueue } from "@/features/movies/queueService";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const queue = await getPendingQueue(session.username);
    return successResponse(queue);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "queue");
