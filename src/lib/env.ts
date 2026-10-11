export const env = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  BASEROW_API_URL: process.env.BASEROW_API_URL || 'https://api.baserow.io',
  BASEROW_DATABASE_ID: process.env.BASEROW_DATABASE_ID || '',
  BASEROW_API_TOKEN: process.env.BASEROW_API_TOKEN || '',
  BASEROW_USERS_TABLE_ID: process.env.BASEROW_USERS_TABLE_ID || '',
  BASEROW_MOVIES_TABLE_ID: process.env.BASEROW_MOVIES_TABLE_ID || '',
  BASEROW_PIRATES_TABLE_ID: process.env.BASEROW_PIRATES_TABLE_ID || '',
  TMDB_API_KEY: process.env.TMDB_API_KEY || '',
  AUTH_SECRET: process.env.AUTH_SECRET || 'my_development_secret_key_change_me',
  BASEROW_RECOMMENDATION_PROFILE_TABLE_ID: process.env.BASEROW_RECOMMENDATION_PROFILE_TABLE_ID || '',
  BASEROW_RECOMMENDATION_SETS_TABLE_ID: process.env.BASEROW_RECOMMENDATION_SETS_TABLE_ID || '',

  // Gemini AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_API_BASE_URL: process.env.GEMINI_API_BASE_URL || 'https://gemini-web2api-clone.vercel.app/v1',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.7-flash',

  // Recommendation lifecycle
  RECOMMENDATION_FRESHNESS_HOURS: parseInt(process.env.RECOMMENDATION_FRESHNESS_HOURS || '72', 10),
};
