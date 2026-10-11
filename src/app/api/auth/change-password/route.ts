import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { changePassword } from "@/features/auth/authService";

export const POST = withLogger(async (req: NextRequest) => {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const body = await req.json();
    await changePassword(session.userId, body);
    
    return successResponse(null, "Password changed successfully");
  } catch (error: any) {
    return handleApiError(error);
  }
}, "auth-change-password");
