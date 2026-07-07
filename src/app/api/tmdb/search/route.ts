import { NextRequest } from "next/server";
import { searchTMDB } from "@/features/movies/tmdbService";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const query = req.nextUrl.searchParams.get("query");
  if (!query) return errorResponse("Missing query", 400, "BAD_REQUEST");

  try {
    const results = await searchTMDB(query);
    return successResponse(results);
  } catch (error: any) {
    console.error("TMDB Search Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
