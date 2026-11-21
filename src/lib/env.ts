export const env = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Baserow core configuration
  BASEROW_API_URL: process.env.BASEROW_API_URL || 'https://api.baserow.io',
  BASEROW_DATABASE_ID: process.env.BASEROW_DATABASE_ID || '',
  BASEROW_API_TOKEN: process.env.BASEROW_API_TOKEN || '',

  // Baserow Table IDs — Movies/Series/Anime tables
  BASEROW_USERS_TABLE_ID: process.env.BASEROW_USERS_TABLE_ID || '',
  BASEROW_MOVIES_TABLE_ID: process.env.BASEROW_MOVIES_TABLE_ID || '',
  BASEROW_PIRATES_TABLE_ID: process.env.BASEROW_PIRATES_TABLE_ID || '',

  // Baserow Table IDs — Games tables (DEDICATED, SEPARATE from movies)
  BASEROW_GAMES_TABLE_ID: process.env.BASEROW_GAMES_TABLE_ID || '',
  BASEROW_GAME_PIRATES_TABLE_ID: process.env.BASEROW_GAME_PIRATES_TABLE_ID || '',

  // Baserow Table IDs — AI/Recommendation tables
  BASEROW_RECOMMENDATION_PROFILE_TABLE_ID: process.env.BASEROW_RECOMMENDATION_PROFILE_TABLE_ID || '',
  BASEROW_RECOMMENDATION_SETS_TABLE_ID: process.env.BASEROW_RECOMMENDATION_SETS_TABLE_ID || '',

  // TMDB (for movies/series/anime metadata)
  TMDB_API_KEY: process.env.TMDB_API_KEY || '',

  // RAWG (for game metadata)
  RAWG_API_KEY: process.env.RAWG_API_KEY || '',

  // Gemini AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_API_BASE_URL: process.env.GEMINI_API_BASE_URL || 'https://gemini-web2api-clone.vercel.app/v1',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.7-flash',

  // Auth
  AUTH_SECRET: process.env.AUTH_SECRET || 'my_development_secret_key_change_me',

  // Recommendation lifecycle
  RECOMMENDATION_FRESHNESS_HOURS: parseInt(process.env.RECOMMENDATION_FRESHNESS_HOURS || '72', 10),
};
