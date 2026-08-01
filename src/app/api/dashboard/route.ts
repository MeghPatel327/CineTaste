import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { getDashboardStatsService } from "@/features/dashboard/dashboardService";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const data = await getDashboardStatsService(session.username);
    return successResponse(data);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "dashboard");
