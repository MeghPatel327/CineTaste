import { NextRequest } from "next/server";
import { updatePirateSiteService, deletePirateSiteService } from "@/features/admin/adminService";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const { id } = await params;
    const siteId = parseInt(id, 10);
    const body = await req.json();
    
    const updatedSite = await updatePirateSiteService(siteId, body);
    return successResponse(updatedSite, "Pirate site updated");
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const { id } = await params;
    const siteId = parseInt(id, 10);
    
    await deletePirateSiteService(siteId);
    return successResponse(null, "Pirate site deleted");
  } catch (error: any) {
    return handleApiError(error);
  }
}
