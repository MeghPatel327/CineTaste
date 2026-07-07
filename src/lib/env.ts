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
};
