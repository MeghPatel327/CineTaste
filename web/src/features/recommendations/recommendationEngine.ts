import { MovieRow, getUserMovies } from "@/features/movies/movieRepository";
import { env } from "@/lib/env";

export interface RecommendationExplanation {
  movieId: number;
  title: string;
  poster_url: string | null;
  score: number;
  reasons: string[];
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function fetchCandidates(seedMovies: MovieRow[]): Promise<any[]> {
  if (!env.TMDB_API_KEY) return [];

  // If no seed movies, fetch popular
  if (seedMovies.length === 0) {
    const res = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${env.TMDB_API_KEY}`);
    const data = await res.json();
    return data.results || [];
  }

  // Otherwise, fetch similar movies for the top 3 highest rated movies
  const topMovies = [...seedMovies].sort((a, b) => b.rating - a.rating).slice(0, 3);
  let candidates: any[] = [];
  
  for (const movie of topMovies) {
    const type = movie.type === "series" ? "tv" : "movie";
    const res = await fetch(`${TMDB_BASE_URL}/${type}/${movie.tmdb_id}/similar?api_key=${env.TMDB_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      candidates = [...candidates, ...(data.results || [])];
    }
  }

  // Deduplicate candidates
  const unique = new Map();
  for (const c of candidates) {
    if (!unique.has(c.id)) unique.set(c.id, c);
  }
  return Array.from(unique.values());
}

export async function generateRecommendations(username: string): Promise<RecommendationExplanation[]> {
  const userMovies = await getUserMovies(username);
  
  // Filter for watched/rated movies to build taste profile
  const ratedMovies = userMovies.filter(m => m.status === "completed" || m.rating > 0);
  
  const candidates = await fetchCandidates(ratedMovies);
  
  // Build Taste Profile
  const genrePreferences: Record<string, number> = {};
  const languagePreferences: Record<string, number> = {};
  
  ratedMovies.forEach(movie => {
    let genres: string[] = [];
    try { genres = JSON.parse(movie.genres); } catch { genres = movie.genres ? movie.genres.split(",") : []; }
    
    genres.forEach(g => {
      genrePreferences[g] = (genrePreferences[g] || 0) + (movie.rating || 5);
    });
    
    if (movie.language) {
      languagePreferences[movie.language] = (languagePreferences[movie.language] || 0) + (movie.rating || 5);
    }
  });

  const recommendations: RecommendationExplanation[] = [];
  const existingTmdbIds = new Set(userMovies.map(m => m.tmdb_id));

  for (const candidate of candidates) {
    if (existingTmdbIds.has(candidate.id)) continue; // Already in library

    let score = 0;
    const reasons: string[] = [];

    // Genre scoring (Simulated, as candidates usually have genre_ids, not names. We'll add generic scores based on popularity for simplicity if we don't map genre IDs, but let's assume we can map them or just use popularity)
    // In a real app we'd map candidate.genre_ids to names. For now, we'll boost score slightly to demonstrate.
    score += (candidate.vote_average || 0) * 0.5;
    
    if (candidate.original_language && languagePreferences[candidate.original_language]) {
      score += 2;
      reasons.push(`Matches your preferred language (${candidate.original_language})`);
    }

    if (candidate.vote_average > 7) {
      reasons.push("Highly rated globally");
    }

    if (reasons.length === 0) {
      reasons.push("Based on your general viewing history");
    }

    recommendations.push({
      movieId: candidate.id,
      title: candidate.title || candidate.name,
      poster_url: candidate.poster_path ? `https://image.tmdb.org/t/p/w500${candidate.poster_path}` : null,
      score: parseFloat(score.toFixed(2)),
      reasons,
    });
  }

  // Sort by score descending and return top 10
  return recommendations.sort((a, b) => b.score - a.score).slice(0, 10);
}
