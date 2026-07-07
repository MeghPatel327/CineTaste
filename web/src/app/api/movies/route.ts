import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserMovies, addMovie, MovieRow } from "@/features/movies/movieRepository";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getSession } from "@/lib/session";

const addMovieSchema = z.object({
  movie_name: z.string().min(1),
  type: z.enum(["movie", "series"]),
  status: z.enum(["completed", "pending", "dropped"]),
  rating: z.number().min(0).max(10),
  watch_order_rank: z.number().int(),
  watch_link: z.string().nullable().optional(),
  tmdb_id: z.number(),
  genres: z.string(),
  release_year: z.number(),
  runtime: z.number(),
  language: z.string(),
  poster_url: z.string(),
  overview: z.string(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const movies = await getUserMovies(session.username);
    return successResponse(movies);
  } catch (error: any) {
    console.error("Get Movies Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await req.json();
    const result = addMovieSchema.safeParse(body);

    if (!result.success) {
      return errorResponse("Validation error", 400, "VALIDATION_ERROR");
    }

    const movies = await getUserMovies(session.username);
    const exists = movies.some((m) => m.movie_name.toLowerCase() === result.data.movie_name.toLowerCase());
    
    if (exists) {
      return errorResponse("Movie already exists in your library", 409, "DUPLICATE_MOVIE");
    }

    const newMovie = await addMovie({
      ...result.data,
      watch_link: result.data.watch_link || null,
      username: session.username,
    });

    return successResponse(newMovie, "Movie added successfully");
  } catch (error: any) {
    console.error("Add Movie Error:", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
