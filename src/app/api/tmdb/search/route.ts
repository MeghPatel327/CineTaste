import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { searchTMDB } from "@/features/movies/tmdbService";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { logger } from "@/lib/logger";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const query = req.nextUrl.searchParams.get("query");
  if (!query) return errorResponse("Missing query", 400, "BAD_REQUEST");

  try {
    const results = await searchTMDB(query);
    return successResponse(results);
  } catch (error: any) {
    logger.error({ module: "tmdbService", action: "SEARCH", status: "FAILED", error, message: "TMDB Search Error" });
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}, "tmdb-search");
