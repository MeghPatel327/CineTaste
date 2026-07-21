import { NextRequest } from "next/server";
import { successResponse, handleApiError, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";
import { moveMovieUp, moveMovieDown } from "@/features/movies/queueService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ movieId: string }> }
) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { movieId } = await params;
    const movieIdNum = parseInt(movieId, 10);
    const { direction } = await req.json();

    if (direction === "up") {
      const result = await moveMovieUp(movieIdNum, session.username);
      return successResponse(result, "Movie moved up");
    } else if (direction === "down") {
      const result = await moveMovieDown(movieIdNum, session.username);
      return successResponse(result, "Movie moved down");
    } else {
      return errorResponse("Invalid direction", 400, "INVALID_DIRECTION");
    }
  } catch (error: any) {
    return handleApiError(error);
  }
}
