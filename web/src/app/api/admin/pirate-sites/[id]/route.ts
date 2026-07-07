import { NextRequest } from "next/server";
import { updatePirateSite, deletePirateSite } from "@/features/admin/adminRepository";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { z } from "zod";

const updateSiteSchema = z.object({
  name: z.string().min(1).optional(),
  search_url: z.string().url().optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const { id } = await params;
    const siteId = parseInt(id, 10);
    const body = await req.json();
    const result = updateSiteSchema.safeParse(body);

    if (!result.success) {
      return errorResponse("Validation error", 400, "VALIDATION_ERROR");
    }

    const updatedSite = await updatePirateSite(siteId, result.data);
    return successResponse(updatedSite, "Pirate site updated");
  } catch (error: any) {
    console.error("Update Pirate Site Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const { id } = await params;
    const siteId = parseInt(id, 10);
    await deletePirateSite(siteId);
    return successResponse(null, "Pirate site deleted");
  } catch (error: any) {
    console.error("Delete Pirate Site Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
