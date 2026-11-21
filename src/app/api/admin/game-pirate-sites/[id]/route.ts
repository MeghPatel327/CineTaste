import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { updateGamePirateSiteService, deleteGamePirateSiteService } from "@/features/admin/adminService";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export const PATCH = withLogger(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateGamePirateSiteService(Number(id), body);
    return successResponse(updated, "Game site updated");
  } catch (error: any) {
    return handleApiError(error);
  }
}, "admin-game-pirate-sites-update");

export const DELETE = withLogger(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const { id } = await params;
    await deleteGamePirateSiteService(Number(id));
    return successResponse(null, "Game site deleted");
  } catch (error: any) {
    return handleApiError(error);
  }
}, "admin-game-pirate-sites-delete");

