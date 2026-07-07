import { NextRequest } from "next/server";
import { getAllUsersService } from "@/features/admin/adminService";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const sanitized = await getAllUsersService();
    return successResponse(sanitized);
  } catch (error: any) {
    return handleApiError(error);
  }
}
