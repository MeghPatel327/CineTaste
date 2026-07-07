import { NextRequest } from "next/server";
import { getTMDBDetails } from "@/features/movies/tmdbService";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type") as "movie" | "tv";

  if (!id || !type) return errorResponse("Missing parameters", 400, "BAD_REQUEST");

  try {
    const details = await getTMDBDetails(parseInt(id, 10), type);
    return successResponse(details);
  } catch (error: any) {
    console.error("TMDB Details Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
