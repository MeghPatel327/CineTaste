import { withLogger } from "@/lib/apiWrapper";
import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import {
  getBrowseCatalogueService,
  type BrowseCategory,
  type BrowseCatalogueOptions,
} from "@/features/movies/browseService";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const searchParams = req.nextUrl.searchParams;
  const categoryParam = searchParams.get("category") || "movies";
  const validCategories: BrowseCategory[] = ["movies", "series", "anime"];
  const category: BrowseCategory = validCategories.includes(
    categoryParam as BrowseCategory
  )
    ? (categoryParam as BrowseCategory)
    : "movies";

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const query = searchParams.get("query") || "";
  const era = searchParams.get("era") || "";
  const subType = searchParams.get("subType") || "all";
  const sort = (searchParams.get("sort") || "recommended") as
    | "recommended"
    | "popularity"
    | "rating"
    | "year"
    | "year-asc"
    | "title"
    | "title-desc";

  // Support both comma-separated genres and multiple genre query params
  const rawGenres = searchParams.get("genres") || searchParams.get("genre") || "";
  const genres = rawGenres
    ? rawGenres.split(",").map((g) => g.trim()).filter((g) => g && g !== "All")
    : [];

  const autoExpand = searchParams.get("autoExpand") !== "false";

  const options: BrowseCatalogueOptions = {
    page,
    limit,
    genres,
    era,
    subType,
    sort,
    query,
    autoExpand,
  };

  try {
    const result = await getBrowseCatalogueService(session.username, category, options);
    return successResponse(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "browse");
