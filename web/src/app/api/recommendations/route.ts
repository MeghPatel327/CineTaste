import { NextRequest } from "next/server";
import { generateRecommendations } from "@/features/recommendations/recommendationEngine";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const recommendations = await generateRecommendations(session.username);
    return successResponse(recommendations);
  } catch (error: any) {
    console.error("Recommendations Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
