import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  return successResponse(session);
}
