import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { getAllUsersService } from "@/features/admin/adminService";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const sanitized = await getAllUsersService();
    return successResponse(sanitized);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "admin-users");
