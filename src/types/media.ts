export interface WatchOption {
  linkId: string;
  providerId: string;
  providerName: string;
  providerType: "subscription" | "rent_buy" | "free_ad_supported" | "external_catalog";
  directUrl: string;
  qualityLabel?: "4K UHD" | "1080p FHD" | "720p HD" | "SD";
  languageAudio?: string;
  badgeLabel?: string;
  iconUrl?: string;
  isVerified: boolean;
}

export interface MediaItem {
  id: string;
  tmdbId?: string;
  title: string;
  tagline?: string;
  overview: string;
  backdropUrl: string;
  posterUrl: string;
  releaseYear: number;
  releaseDate?: string;
  rating: number; // e.g. 8.8
  voteCount?: number;
  genres: string[];
  runtime?: string;
  mediaType: "movie" | "tv";
  badge?: "4K UHD" | "IMAX" | "HDR10+" | "DOLBY VISION";
  audio?: "Dolby Atmos" | "5.1 Surround";
  directors?: string[];
  topCast?: string[];
  watchProgress?: number; // 0 to 100 for 'Continue Watching'
  recommendationReason?: string;
  watchOptions?: WatchOption[];
}

export interface CarouselSlide extends MediaItem {
  spotlightCategory: string; // e.g. "Featured Spotlight", "Critically Acclaimed", etc.
}

export type LibraryStatus = "watching" | "completed" | "plan_to_watch" | "dropped" | "none";

export interface UserMediaRecord {
  tmdbId: string;
  libraryStatus: LibraryStatus;
  isInQueue: boolean;
  isFavorite: boolean;
  userRating?: number; // 1 - 10
  watchProgress?: number; // 0 - 100
  isExcluded: boolean;
  notes?: string;
  updatedAt: string;
}

export interface TasteProfileData {
  primaryGenres: string[];
  affinityScores: Record<string, number>;
  directorAffinities: string[];
  totalCompleted: number;
  totalHoursWatched: number;
  averageRating: number;
  lastRecalculated: string;
}

export interface ProfileStats {
  totalCompleted: number;
  totalInQueue: number;
  totalWatching: number;
  totalPlanToWatch: number;
  totalHoursWatched: number;
  averageUserRating: number;
  genreBreakdown: { genre: string; count: number; percentage: number }[];
  ratingDistribution: { rating: number; count: number }[];
  recentActivity: {
    tmdbId: string;
    title: string;
    action: string;
    date: string;
    rating?: number;
    posterUrl?: string;
  }[];
}
