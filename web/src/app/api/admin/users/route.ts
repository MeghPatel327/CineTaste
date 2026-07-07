import { NextRequest } from "next/server";
import { getAllUsers } from "@/features/admin/adminRepository";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return errorResponse("Forbidden", 403, "FORBIDDEN");

  try {
    const users = await getAllUsers();
    // Don't leak hashes
    const sanitized = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      blocked: u.blocked,
      created_at: u.created_at,
      last_login: u.last_login
    }));
    return successResponse(sanitized);
  } catch (error: any) {
    console.error("Get Users Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
