import { NextRequest } from "next/server";
import { withLogger } from "@/lib/apiWrapper";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { getUserGames } from "@/features/games/gameRepository";
import { addGameToLibraryService } from "@/features/games/gameService";

import type { GameItem, GameStatus } from "@/features/games/gameTypes";

export const GET = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const rawGames = await getUserGames(session.username);
    const games: GameItem[] = rawGames.map((g) => ({
      id: g.tmdb_id,
      title: g.movie_name,
      cover_url: g.poster_url,
      backdrop_url: null,
      release_year: g.release_year,
      rating: g.rating,
      genres: (() => {
        try {
          return JSON.parse(g.genres);
        } catch {
          return g.genres ? g.genres.split(",") : [];
        }
      })(),
      platforms: (() => {
        try {
          return JSON.parse(g.language);
        } catch {
          return g.language ? g.language.split(",") : [];
        }
      })(),
      game_modes: [],
      themes: [],
      summary: g.overview,
      inLibrary: true,
      libraryStatus: (g.status === "watching" ? "playing" : g.status) as GameStatus,
      status: (g.status === "watching" ? "playing" : g.status) as GameStatus,
      userRating: g.rating,
      userReview: g.personal_review,
      playtime_hours: g.runtime,
      libraryData: {
        id: g.id,
        status: (g.status === "watching" ? "playing" : g.status) as GameStatus,
        rating: g.rating,
        playtime_hours: g.runtime,
        personal_review: g.personal_review,
      },
    }));
    return successResponse({ games });
  } catch (error: any) {
    return handleApiError(error);
  }
}, "games-library-list");

export const POST = withLogger(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await req.json();
    const newGame = await addGameToLibraryService(session.username, body);
    return successResponse(newGame, "Game added to library successfully");
  } catch (error: any) {
    return handleApiError(error);
  }
}, "games-library-add");
