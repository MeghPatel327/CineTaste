export type GameStatus = "playing" | "completed" | "pending" | "on_hold" | "dropped";

export interface GamePlatform {
  id: number;
  name: string;
  abbreviation?: string;
}

export interface GameLibraryData {
  id?: number;
  status?: GameStatus;
  rating?: number;
  playtime_hours?: number;
  personal_review?: string;
  watch_link?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GameItem {
  id: number; // Canonical RAWG game ID
  title: string;
  cover_url: string | null;
  backdrop_url: string | null;
  release_year?: number;
  first_release_date?: number; // unix timestamp in seconds
  release_date?: string;
  rating?: number; // 0-10 scale (user rating or normalized RAWG/metacritic)
  rawg_rating?: number; // 0-5 scale from RAWG (multiply by 2 for 0-10)
  igdb_rating?: number; // backwards compatibility
  rating_count?: number;
  score?: number; // Match affinity score (65-98)
  genres: string[];
  platforms: string[];
  game_modes: string[];
  themes: string[];
  isAdult?: boolean; // True if game contains 18+/adult content
  developer?: string | null;
  developers?: string[];
  publisher?: string | null;
  publishers?: string[];
  summary?: string;
  storyline?: string;
  url?: string;
  inLibrary?: boolean;
  libraryStatus?: GameStatus | null;
  status?: GameStatus;
  userRating?: number;
  userReview?: string;
  playtime_hours?: number;
  libraryData?: GameLibraryData | null;
}

export interface GameDetails extends GameItem {
  screenshots: string[];
  artworks: string[];
  similar_games: Array<{
    id: number;
    title: string;
    cover_url: string | null;
    release_year?: number;
  }>;
}

export interface GameFilterOptions {
  genres?: string[];
  platforms?: string[];
  gameModes?: string[];
  era?: string; // "2020s" | "2010s" | "2000s" | "1990s" | "Classic"
  rating?: number; // Minimum rating filter
  includeAdult?: boolean; // Include 18+/adult games when true
  status?: GameStatus | "all";
  sort?: "recommended" | "rating" | "popularity" | "year" | "year-asc" | "title" | "title-desc" | string;
  query?: string;
  page?: number;
  limit?: number;
}

export interface GameBrowseResult {
  items: GameItem[];
  games?: GameItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  availableGenres: string[];
  availablePlatforms: string[];
  availableEras: string[];
  availableGameModes: string[];
  featuredSpotlight: GameItem | null;
}

export interface GameDashboardStats {
  total: number;
  totalGames: number;
  playing: number;
  completed: number;
  pending: number; // Backlog
  backlog: number;
  onHold: number;
  dropped: number;
  avgRating: number;
  completionRate: number;
  totalPlaytimeHours: number;
  topGenres: Array<{ name: string; value: number; genre: string; count: number }>;
  topPlatforms: Array<{ name: string; value: number; platform: string; count: number }>;
  nextUp: GameItem[];
  nextUpBacklog: GameItem[];
  recentActivity: GameItem[];
  recentlyUpdated: GameItem[];
  discovery?: GameItem[]; // Personalized recommendations strictly excluding all user library titles
  suggestions?: GameItem[];
  trending?: GameItem[]; // Shown when library is empty
}
