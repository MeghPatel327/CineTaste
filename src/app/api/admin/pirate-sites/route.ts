import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { getPirateSitesService, addPirateSiteService } from "@/features/admin/adminService";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const sites = await getPirateSitesService();
    return successResponse(sites);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "admin-pirate-sites");

export const POST = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const body = await req.json();
    const newSite = await addPirateSiteService(body);
    return successResponse(newSite, "Pirate site added");
  } catch (error: any) {
    return handleApiError(error);
  }
}, "admin-pirate-sites");
