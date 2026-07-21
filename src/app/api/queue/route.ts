import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getPendingQueue } from "@/features/movies/queueService";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const queue = await getPendingQueue(session.username);
    return successResponse(queue);
  } catch (error: any) {
    return handleApiError(error);
  }
}
