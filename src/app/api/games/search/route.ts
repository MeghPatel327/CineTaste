import { NextRequest } from "next/server";
import { withLogger } from "@/lib/apiWrapper";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { searchIgdbGames } from "@/lib/igdb";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const query = req.nextUrl.searchParams.get("q") || req.nextUrl.searchParams.get("query") || "";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "15", 10);

  try {
    const results = await searchIgdbGames(query, limit);
    return successResponse(results);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "games-search");

