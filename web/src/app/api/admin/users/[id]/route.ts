import { NextRequest } from "next/server";
import { updateUserAdmin } from "@/features/admin/adminRepository";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { z } from "zod";

const updateUserSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  blocked: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    const body = await req.json();
    const result = updateUserSchema.safeParse(body);

    if (!result.success) {
      return errorResponse("Validation error", 400, "VALIDATION_ERROR");
    }

    const updatedUser = await updateUserAdmin(userId, result.data);
    return successResponse({
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      blocked: updatedUser.blocked
    }, "User updated");
  } catch (error: any) {
    console.error("Update User Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
