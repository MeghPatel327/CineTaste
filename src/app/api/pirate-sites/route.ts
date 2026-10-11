import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getPirateSitesService } from "@/features/admin/adminService";

export const GET = withLogger(async (req: NextRequest) => {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const sites = await getPirateSitesService();
    const enabledSites = sites.filter(s => s.enabled);
    
    return successResponse(enabledSites);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "pirate-sites");
