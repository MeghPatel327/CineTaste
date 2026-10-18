import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { executeUnifiedSearch } from "@/features/movies/searchService";
import type { BrowseCategory } from "@/features/movies/browseService";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const query = req.nextUrl.searchParams.get("query") || "";
  const categoryParam = req.nextUrl.searchParams.get("category") || "all";
  const allowFallback = req.nextUrl.searchParams.get("fallback") !== "false";

  const validCategories = ["all", "movies", "series", "anime"];
  const category = validCategories.includes(categoryParam)
    ? (categoryParam as "all" | BrowseCategory)
    : "all";

  if (!query.trim()) {
    return successResponse({ results: [], fallbackUsed: false, query: "" });
  }

  try {
    const data = await executeUnifiedSearch(query, {
      category,
      allowFallback,
    });
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(error?.message || "Search failed", 500, "INTERNAL_ERROR");
  }
}, "unified-search");
