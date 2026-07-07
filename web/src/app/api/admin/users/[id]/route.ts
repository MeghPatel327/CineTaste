import { NextRequest } from "next/server";
import { updateUserService } from "@/features/admin/adminService";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    const body = await req.json();
    
    const updatedUser = await updateUserService(userId, body);
    return successResponse(updatedUser, "User updated");
  } catch (error: any) {
    return handleApiError(error);
  }
}
