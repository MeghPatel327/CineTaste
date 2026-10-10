/**
 * CineTaste — Server-only Environment Configuration and Validation
 *
 * Enforces security best practices:
 * - Never bundles secrets to client-side code
 * - Validates required keys based on environment
 * - Provides graceful development fallback when external integrations are pending
 */

export interface AppEnvConfig {
  nodeEnv: "development" | "production" | "test";
  appUrl: string;
  isDevMockMode: boolean;
  sessionSecret: string;
  adminSecretKey?: string;
  baserow: {
    apiUrl: string;
    apiToken: string;
    databaseId?: string;
    tables: {
      users?: string;
      media?: string;
      userMedia?: string;
      watchProviders?: string;
      mediaWatchLinks?: string;
      recommendations?: string;
      tasteProfiles?: string;
      feedback?: string;
    };
    isConfigured: boolean;
  };
  tmdb: {
    apiKey: string;
    baseUrl: string;
    imageBaseUrl: string;
    isConfigured: boolean;
  };
  ai: {
    environment: "local" | "production";
    baseUrl: string;
    model: string;
    apiKey?: string;
    timeoutMs: number;
    requestLimit: number;
    isConfigured: boolean;
  };
}

let cachedConfig: AppEnvConfig | null = null;

export function getServerEnv(): AppEnvConfig {
  if (typeof window !== "undefined") {
    throw new Error("Security Violation: getServerEnv() cannot be accessed from client-side code.");
  }

  if (cachedConfig) {
    return cachedConfig;
  }

  const nodeEnv = (process.env.NODE_ENV as "development" | "production" | "test") || "development";
  const isDevMockMode = process.env.APP_DEV_MODE_MOCK !== "false";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Session Secret
  const sessionSecret = process.env.SESSION_SECRET || "cinetaste_default_dev_session_secret_32char_key";
  if (!isDevMockMode && sessionSecret.length < 32) {
    throw new Error("Configuration Error: SESSION_SECRET must be at least 32 characters in production.");
  }

  const adminSecretKey = process.env.ADMIN_SECRET_KEY;

  // Baserow
  const baserowApiUrl = (process.env.BASEROW_API_URL || "https://api.baserow.io").replace(/\/$/, "");
  const baserowApiToken = process.env.BASEROW_API_TOKEN || "";
  const baserowDatabaseId = process.env.BASEROW_DATABASE_ID;
  const baserowTables = {
    users: process.env.BASEROW_TABLE_USERS,
    media: process.env.BASEROW_TABLE_MEDIA,
    userMedia: process.env.BASEROW_TABLE_USER_MEDIA,
    watchProviders: process.env.BASEROW_TABLE_WATCH_PROVIDERS,
    mediaWatchLinks: process.env.BASEROW_TABLE_MEDIA_WATCH_LINKS,
    recommendations: process.env.BASEROW_TABLE_RECOMMENDATIONS,
    tasteProfiles: process.env.BASEROW_TABLE_TASTE_PROFILES,
    feedback: process.env.BASEROW_TABLE_FEEDBACK,
  };

  const isBaserowConfigured = Boolean(
    baserowApiToken &&
    baserowTables.users &&
    baserowTables.media &&
    baserowTables.userMedia
  );

  // TMDB
  const tmdbApiKey = process.env.TMDB_API_KEY || "";
  const tmdbBaseUrl = (process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3").replace(/\/$/, "");
  const tmdbImageBaseUrl = (process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p").replace(/\/$/, "");
  const isTmdbConfigured = Boolean(tmdbApiKey);

  // Gemini Web2API
  const aiEnv = (process.env.AI_ENVIRONMENT === "production" ? "production" : "local") as "local" | "production";
  const aiBaseUrl = aiEnv === "production"
    ? (process.env.GEMINI_PROD_BASE_URL || "").replace(/\/$/, "")
    : (process.env.GEMINI_LOCAL_BASE_URL || "http://localhost:8000/v1").replace(/\/$/, "");

  const aiModel = aiEnv === "production"
    ? (process.env.GEMINI_PROD_MODEL || "gemini-2.5-flash")
    : (process.env.GEMINI_LOCAL_MODEL || "gemini-2.5-flash");

  const aiApiKey = aiEnv === "production"
    ? process.env.GEMINI_PROD_API_KEY
    : process.env.GEMINI_LOCAL_API_KEY;

  const aiTimeoutMs = parseInt(
    (aiEnv === "production" ? process.env.GEMINI_PROD_TIMEOUT_MS : process.env.GEMINI_LOCAL_TIMEOUT_MS) || "15000",
    10
  );

  const aiRequestLimit = parseInt(process.env.GEMINI_REQUEST_LIMIT || "30", 10);
  const isAiConfigured = Boolean(aiBaseUrl);

  // In production without mock mode, check required configurations
  if (nodeEnv === "production" && !isDevMockMode) {
    const missing: string[] = [];
    if (!baserowApiToken) missing.push("BASEROW_API_TOKEN");
    if (!baserowTables.users) missing.push("BASEROW_TABLE_USERS");
    if (!baserowTables.media) missing.push("BASEROW_TABLE_MEDIA");
    if (!baserowTables.userMedia) missing.push("BASEROW_TABLE_USER_MEDIA");
    if (!tmdbApiKey) missing.push("TMDB_API_KEY");
    if (aiEnv === "production" && !aiBaseUrl) missing.push("GEMINI_PROD_BASE_URL");

    if (missing.length > 0) {
      throw new Error(
        `Production Configuration Failure: Missing required environment variables:\n` +
        missing.map((key) => ` - ${key}`).join("\n") +
        `\nRefer to .env.example or set APP_DEV_MODE_MOCK=true to run in fallback UI mode.`
      );
    }
  }

  cachedConfig = {
    nodeEnv,
    appUrl,
    isDevMockMode,
    sessionSecret,
    adminSecretKey,
    baserow: {
      apiUrl: baserowApiUrl,
      apiToken: baserowApiToken,
      databaseId: baserowDatabaseId,
      tables: baserowTables,
      isConfigured: isBaserowConfigured,
    },
    tmdb: {
      apiKey: tmdbApiKey,
      baseUrl: tmdbBaseUrl,
      imageBaseUrl: tmdbImageBaseUrl,
      isConfigured: isTmdbConfigured,
    },
    ai: {
      environment: aiEnv,
      baseUrl: aiBaseUrl,
      model: aiModel,
      apiKey: aiApiKey,
      timeoutMs: isNaN(aiTimeoutMs) ? 15000 : aiTimeoutMs,
      requestLimit: isNaN(aiRequestLimit) ? 30 : aiRequestLimit,
      isConfigured: isAiConfigured,
    },
  };

  return cachedConfig;
}
