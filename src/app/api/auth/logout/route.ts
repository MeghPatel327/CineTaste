import { withLogger } from "@/lib/apiWrapper";
import { successResponse } from "@/lib/apiResponse";
import { destroySession } from "@/lib/session";

export const POST = withLogger(async () => {
  await destroySession();
  return successResponse(null, "Logged out successfully");
}, "auth-logout");
