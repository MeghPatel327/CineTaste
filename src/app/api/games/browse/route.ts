import { NextRequest } from "next/server";
import { withLogger } from "@/lib/apiWrapper";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getGameBrowseService } from "@/features/games/gameService";
import type { GameFilterOptions } from "@/features/games/gameTypes";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const query = searchParams.get("query") || "";
  const era = searchParams.get("era") || "";
  const sort = (searchParams.get("sort") || "recommended") as any;

  const rawGenres = searchParams.get("genres") || searchParams.get("genre") || "";
  const genres = rawGenres
    ? rawGenres.split(",").map((g) => g.trim()).filter((g) => g && g !== "All")
    : [];

  const rawPlatforms = searchParams.get("platforms") || searchParams.get("platform") || "";
  const platforms = rawPlatforms
    ? rawPlatforms.split(",").map((p) => p.trim()).filter((p) => p && p !== "All")
    : [];

  const rawGameModes = searchParams.get("gameModes") || searchParams.get("gameMode") || "";
  const gameModes = rawGameModes
    ? rawGameModes.split(",").map((m) => m.trim()).filter((m) => m && m !== "All")
    : [];

  const options: GameFilterOptions = {
    page,
    limit,
    genres,
    platforms,
    gameModes,
    era,
    sort,
    query,
  };

  try {
    const result = await getGameBrowseService(session.username, options);
    return successResponse(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}, "games-browse");
