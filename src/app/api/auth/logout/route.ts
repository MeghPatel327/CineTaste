import { successResponse } from "@/lib/apiResponse";
import { destroySession } from "@/lib/session";

export async function POST() {
  await destroySession();
  return successResponse(null, "Logged out successfully");
}
