import { MovieRow, getUserMovies } from "@/features/movies/movieRepository";
import { env } from "@/lib/env";
import { getFilmIndustry } from "@/lib/utils";

export interface RecommendationExplanation {
  movieId: number;
  title: string;
  poster_url: string | null;
  score: number;
  reasons: string[];
  media_type?: "movie" | "tv";
  genres?: string[];
  release_year?: number;
  vote_average?: number;
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama",
  10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy", 
  10766: "Soap", 10767: "Talk", 10768: "War & Politics"
};

const RATING_WEIGHTS: Record<number, number> = {
  10: 2.0,
  9: 1.5,
  8: 1.0,
  7: 0.5,
  6: 0.0,
  5: -0.25,
  4: -0.5,
  3: -1.0,
  2: -1.5,
  1: -2.0,
};

async function fetchCandidates(seedMovies: MovieRow[]): Promise<any[]> {
  if (!env.TMDB_API_KEY) return [];

  try {
    if (seedMovies.length === 0) {
      const res = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${env.TMDB_API_KEY}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    }

    const topMovies = [...seedMovies].sort((a, b) => b.rating - a.rating).slice(0, 8);
    let candidates: any[] = [];
    
    const promises = topMovies.map(movie => {
      const type = movie.type === "series" ? "tv" : "movie";
      return Promise.all([
        fetch(`${TMDB_BASE_URL}/${type}/${movie.tmdb_id}/similar?api_key=${env.TMDB_API_KEY}`).then(res => res.ok ? res.json() : null),
        fetch(`${TMDB_BASE_URL}/${type}/${movie.tmdb_id}/recommendations?api_key=${env.TMDB_API_KEY}`).then(res => res.ok ? res.json() : null)
      ]).catch(() => [null, null]);
    });

    const results = await Promise.all(promises);
    for (const [similarData, recData] of results) {
      if (similarData?.results) candidates = [...candidates, ...similarData.results];
      if (recData?.results) candidates = [...candidates, ...recData.results];
    }

    const unique = new Map();
    for (const c of candidates) {
      if (!unique.has(c.id)) unique.set(c.id, c);
    }
    return Array.from(unique.values());
  } catch (error) {
    console.error("TMDB Fetch Error:", error);
    return [];
  }
}

export async function generateRecommendations(
  username: string,
  options?: { offset?: number; limit?: number }
): Promise<RecommendationExplanation[]> {
  const userMovies = await getUserMovies(username);
  const ratedMovies = userMovies.filter(m => m.rating > 0);
  
  const candidates = await fetchCandidates(ratedMovies);
  
  const libraryTmdbIds = new Set(userMovies.map(m => m.tmdb_id));
  const libraryNames = new Set(userMovies.map(m => m.movie_name.toLowerCase()));

  const filteredCandidates = candidates.filter(c => {
    if (libraryTmdbIds.has(c.id)) return false;
    const title = (c.title || c.name || "").toLowerCase();
    if (libraryNames.has(title)) return false;
    return true;
  });

  if (ratedMovies.length === 0) {
    const all = filteredCandidates.map(c => ({
      movieId: c.id,
      title: c.title || c.name,
      poster_url: c.poster_path ? `https://image.tmdb.org/t/p/w500${c.poster_path}` : null,
      score: Math.round((c.vote_average || 0) * 10),
      reasons: ["Popular right now"],
      media_type: (c.media_type || (c.first_air_date ? "tv" : "movie")) as "movie" | "tv",
      genres: (c.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean),
      release_year: parseInt((c.release_date || c.first_air_date || "0").split("-")[0], 10) || 0,
      vote_average: c.vote_average || 0,
    })).sort((a, b) => b.score - a.score);
    
    if (options?.offset !== undefined && options?.limit !== undefined) {
      return all.slice(options.offset, options.offset + options.limit);
    }
    return all;
  }

  const genrePreferences: Record<string, number> = {};
  const industryPreferences: Record<string, number> = {};
  const yearPreferences: number[] = [];
  
  ratedMovies.forEach(movie => {
    const weight = RATING_WEIGHTS[movie.rating] !== undefined ? RATING_WEIGHTS[movie.rating] : 0;
    
    let genres: string[] = [];
    try { genres = JSON.parse(movie.genres); } catch { genres = movie.genres ? movie.genres.split(",") : []; }
    
    genres.forEach(g => {
      genrePreferences[g] = (genrePreferences[g] || 0) + weight;
    });
    
    if (movie.language) {
      const industry = getFilmIndustry(movie.language);
      industryPreferences[industry] = (industryPreferences[industry] || 0) + weight;
    }

    if (movie.release_year && weight > 0) {
      yearPreferences.push(movie.release_year);
    }
  });

  const maxGenreScore = Math.max(...Object.values(genrePreferences).map(Math.abs), 1);
  const maxIndustryScore = Math.max(...Object.values(industryPreferences).map(Math.abs), 1);
  const avgYear = yearPreferences.length > 0 ? Math.round(yearPreferences.reduce((a,b) => a+b, 0) / yearPreferences.length) : 0;

  const recommendations: RecommendationExplanation[] = [];

  for (const candidate of filteredCandidates) {
    let compositeScore = 0;
    const reasons: string[] = [];

    // 1. Genre Score (Weight: 55%)
    const candidateGenres = (candidate.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean);
    if (candidateGenres.length > 0) {
      let candidateGenreScore = 0;
      let matchedFavoriteGenres: string[] = [];
      let matchedDislikedGenres: string[] = [];

      candidateGenres.forEach((g: string) => {
        if (genrePreferences[g]) {
          const normalized = genrePreferences[g] / maxGenreScore;
          candidateGenreScore += normalized;
          if (normalized >= 0.5) matchedFavoriteGenres.push(g);
          if (normalized <= -0.5) matchedDislikedGenres.push(g);
        }
      });
      
      const avgCandidateGenreScore = candidateGenreScore / candidateGenres.length;
      compositeScore += avgCandidateGenreScore * 55;

      if (avgCandidateGenreScore > 0.4 && matchedFavoriteGenres.length > 0) {
        reasons.push(`Strong match with your favorite genres (${matchedFavoriteGenres.slice(0, 2).join(", ")})`);
      } else if (avgCandidateGenreScore > 0) {
        reasons.push(`Contains genres you generally enjoy`);
      } else if (avgCandidateGenreScore < -0.4 && matchedDislikedGenres.length > 0) {
        reasons.push(`Warning: Contains genres you dislike (${matchedDislikedGenres.slice(0, 2).join(", ")})`);
      }
    }

    // 2. Industry Score (Weight: 15%)
    if (candidate.original_language) {
      const industry = getFilmIndustry(candidate.original_language);
      if (industryPreferences[industry]) {
        const normalized = industryPreferences[industry] / maxIndustryScore;
        compositeScore += normalized * 15;
        if (normalized >= 0.5) {
          reasons.push(`Matches your preferred Film Industry (${industry})`);
        }
      }
    }

    // 3. Release Year Score (Weight: 15%)
    const releaseDate = candidate.release_date || candidate.first_air_date;
    if (releaseDate && avgYear > 0) {
      const year = parseInt(releaseDate.split("-")[0], 10);
      const diff = Math.abs(year - avgYear);
      if (diff <= 15) {
        const yearScore = 1 - (diff / 15);
        compositeScore += yearScore * 15;
        if (diff <= 5) {
          reasons.push(`Released in your preferred era (~${year})`);
        }
      }
    }

    // 4. Base Quality/Popularity (Weight: 15%)
    const voteScore = (candidate.vote_average || 0) / 10;
    compositeScore += voteScore * 15;
    if (candidate.vote_average > 7.5) {
      reasons.push("Highly rated globally");
    }

    let finalScore = Math.round(compositeScore + 30);
    if (finalScore > 99) finalScore = 99;
    if (finalScore < 0) finalScore = 0;

    if (finalScore >= 60) {
      if (reasons.length === 0) {
        reasons.push("Recommended based on your overall taste profile");
      }

      recommendations.push({
        movieId: candidate.id,
        title: candidate.title || candidate.name,
        poster_url: candidate.poster_path ? `https://image.tmdb.org/t/p/w500${candidate.poster_path}` : null,
        score: finalScore,
        reasons,
        media_type: (candidate.media_type || (candidate.first_air_date ? "tv" : "movie")) as "movie" | "tv",
        genres: candidateGenres,
        release_year: parseInt((candidate.release_date || candidate.first_air_date || "0").split("-")[0], 10) || 0,
        vote_average: candidate.vote_average || 0,
      });
    }
  }

  // Deduplicate, sort by score descending
  const uniqueRecs = new Map<number, RecommendationExplanation>();
  for (const r of recommendations) {
    if (!uniqueRecs.has(r.movieId) || uniqueRecs.get(r.movieId)!.score < r.score) {
      uniqueRecs.set(r.movieId, r);
    }
  }

  const sorted = Array.from(uniqueRecs.values()).sort((a, b) => b.score - a.score);

  if (options?.offset !== undefined && options?.limit !== undefined) {
    return sorted.slice(options.offset, options.offset + options.limit);
  }
  return sorted;
}

/**
 * Returns the user's top genre names (sorted by preference weight descending).
 */
export async function getUserTopGenres(username: string): Promise<string[]> {
  const userMovies = await getUserMovies(username);
  const ratedMovies = userMovies.filter(m => m.rating > 0);
  
  const genreCounts: Record<string, number> = {};
  ratedMovies.forEach(movie => {
    const weight = RATING_WEIGHTS[movie.rating] !== undefined ? RATING_WEIGHTS[movie.rating] : 0;
    if (weight <= 0) return;
    let genres: string[] = [];
    try { genres = JSON.parse(movie.genres); } catch { genres = movie.genres ? movie.genres.split(",") : []; }
    genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + weight; });
  });

  return Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

