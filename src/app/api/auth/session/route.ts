import { withLogger } from "@/lib/apiWrapper";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export const GET = withLogger(async () => {
  const session = await getSession();
  if (!session) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  return successResponse(session);
}, "auth-session");
