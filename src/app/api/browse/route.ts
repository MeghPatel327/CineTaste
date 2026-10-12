import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import {
  getBrowseFeedService,
  searchBrowseService,
  type BrowseCategory,
} from "@/features/movies/browseService";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const searchParams = req.nextUrl.searchParams;
  const categoryParam = searchParams.get("category") || "movies";
  const query = searchParams.get("query") || "";
  const genre = searchParams.get("genre") || "";

  const validCategories: BrowseCategory[] = ["movies", "series", "anime"];
  const category: BrowseCategory = validCategories.includes(
    categoryParam as BrowseCategory
  )
    ? (categoryParam as BrowseCategory)
    : "movies";

  try {
    // If search query or genre filter is provided for live filtering
    if (query.trim() || (genre && genre !== "All")) {
      const results = await searchBrowseService(category, query, genre);
      return successResponse({ results });
    }

    // Default: full category browse feed (hero, personalized recs, rails)
    const feed = await getBrowseFeedService(session.username, category);
    return successResponse(feed);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "browse");
