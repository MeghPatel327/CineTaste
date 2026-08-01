import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { loginUser } from "@/features/auth/authService";
import { withLogger } from "@/lib/apiWrapper";

export const POST = withLogger(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const user = await loginUser(body);
    return successResponse(user, "Logged in successfully");
  } catch (error: any) {
    return handleApiError(error);
  }
}, "auth-login");
