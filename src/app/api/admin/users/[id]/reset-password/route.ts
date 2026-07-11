import { NextRequest } from "next/server";
import { resetUserPasswordService } from "@/features/admin/adminService";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    const { newPassword } = await req.json();
    await resetUserPasswordService(userId, newPassword);
    return successResponse(null, "Password reset successfully");
  } catch (error: any) {
    return handleApiError(error);
  }
}
