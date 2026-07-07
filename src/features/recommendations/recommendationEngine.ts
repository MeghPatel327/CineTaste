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

// Map TMDB genre IDs to names
const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama",
  10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy", 
  10766: "Soap", 10767: "Talk", 10768: "War & Politics"
};

async function fetchCandidates(seedMovies: MovieRow[]): Promise<any[]> {
  if (!env.TMDB_API_KEY) return [];

  // Cold start: If no seed movies, fetch popular
  if (seedMovies.length === 0) {
    const res = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${env.TMDB_API_KEY}`);
    const data = await res.json();
    return data.results || [];
  }

  // Fetch similar movies for the top 5 highest rated movies in parallel
  const topMovies = [...seedMovies].sort((a, b) => b.rating - a.rating).slice(0, 5);
  let candidates: any[] = [];
  
  const promises = topMovies.map(movie => {
    const type = movie.type === "series" ? "tv" : "movie";
    return fetch(`${TMDB_BASE_URL}/${type}/${movie.tmdb_id}/similar?api_key=${env.TMDB_API_KEY}`).then(res => res.ok ? res.json() : null);
  });

  const results = await Promise.all(promises);
  for (const data of results) {
    if (data && data.results) {
      candidates = [...candidates, ...data.results];
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
  
  if (ratedMovies.length === 0) {
    // Cold start scoring
    return candidates.map(c => ({
      movieId: c.id,
      title: c.title || c.name,
      poster_url: c.poster_path ? `https://image.tmdb.org/t/p/w500${c.poster_path}` : null,
      score: c.vote_average || 0,
      reasons: ["Popular right now"],
    })).sort((a, b) => b.score - a.score).slice(0, 10);
  }

  // Build Taste Profile
  const genrePreferences: Record<string, number> = {};
  const languagePreferences: Record<string, number> = {};
  const yearPreferences: number[] = [];
  
  ratedMovies.forEach(movie => {
    let genres: string[] = [];
    try { genres = JSON.parse(movie.genres); } catch { genres = movie.genres ? movie.genres.split(",") : []; }
    
    genres.forEach(g => {
      genrePreferences[g] = (genrePreferences[g] || 0) + (movie.rating || 5);
    });
    
    if (movie.language) {
      languagePreferences[movie.language] = (languagePreferences[movie.language] || 0) + (movie.rating || 5);
    }

    if (movie.release_year) {
      yearPreferences.push(movie.release_year);
    }
  });

  // Normalize max genre score to 10
  const maxGenreScore = Math.max(...Object.values(genrePreferences), 1);
  const avgYear = yearPreferences.length > 0 ? yearPreferences.reduce((a,b) => a+b, 0) / yearPreferences.length : 0;

  const recommendations: RecommendationExplanation[] = [];
  const existingTmdbIds = new Set(userMovies.map(m => m.tmdb_id));

  for (const candidate of candidates) {
    if (existingTmdbIds.has(candidate.id)) continue;

    let score = 0;
    const reasons: string[] = [];
    let matchCount = 0;

    // 1. Genre Score (Weight: 40%)
    const candidateGenres = (candidate.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean);
    if (candidateGenres.length > 0) {
      let candidateGenreScore = 0;
      candidateGenres.forEach((g: string) => {
        if (genrePreferences[g]) {
          candidateGenreScore += (genrePreferences[g] / maxGenreScore) * 10;
        }
      });
      const avgCandidateGenreScore = candidateGenreScore / candidateGenres.length;
      score += (avgCandidateGenreScore / 10) * 0.40;
      if (avgCandidateGenreScore > 5) {
        reasons.push(`Strong genre match (${candidateGenres.join(", ")})`);
        matchCount++;
      }
    }

    // 2. Language Score (Weight: 20%)
    if (candidate.original_language && languagePreferences[candidate.original_language]) {
      score += 0.20;
      reasons.push(`Matches your preferred language (${candidate.original_language})`);
      matchCount++;
    }

    // 3. Release Year Score (Weight: 20%)
    const releaseDate = candidate.release_date || candidate.first_air_date;
    if (releaseDate && avgYear > 0) {
      const year = parseInt(releaseDate.split("-")[0], 10);
      const diff = Math.abs(year - avgYear);
      if (diff <= 10) {
        score += 0.20 * (1 - (diff / 10)); // Closer to avg year = higher score
        if (diff <= 5) {
          reasons.push(`Released in your preferred era (~${year})`);
          matchCount++;
        }
      }
    }

    // 4. Base Quality/Popularity (Weight: 20%)
    const voteScore = (candidate.vote_average || 0) / 10;
    score += voteScore * 0.20;
    if (candidate.vote_average > 7.5) {
      reasons.push("Highly rated globally");
      matchCount++;
    }

    if (matchCount === 0) {
      reasons.push("Recommended based on your recent activity");
    }

    // Scale final score to 10
    const finalScore = parseFloat((score * 10).toFixed(2));

    recommendations.push({
      movieId: candidate.id,
      title: candidate.title || candidate.name,
      poster_url: candidate.poster_path ? `https://image.tmdb.org/t/p/w500${candidate.poster_path}` : null,
      score: finalScore,
      reasons,
    });
  }

  // Sort by score descending and return top 10
  return recommendations.sort((a, b) => b.score - a.score).slice(0, 10);
}
