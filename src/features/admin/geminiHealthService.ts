import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export type HealthStatus = "operational" | "degraded" | "offline" | "unknown";

export type HealthErrorCategory =
  | "missing_credentials"
  | "authentication_failed"
  | "rate_limited"
  | "timeout"
  | "network_error"
  | "service_unavailable"
  | "invalid_response"
  | "client_error"
  | "unknown_error";

export interface GeminiHealthResult {
  status: HealthStatus;
  lastCheckedAt: string | null;
  lastSuccessfulAt: string | null;
  latencyMs: number | null;
  model: string;
  baseUrl: string;
  errorCategory: HealthErrorCategory | null;
  errorMessage: string | null;
}

export interface SystemServicesHealth {
  gemini: GeminiHealthResult;
  tmdb?: {
    status: HealthStatus;
    latencyMs: number | null;
    error: string | null;
  };
  baserow?: {
    status: HealthStatus;
    latencyMs: number | null;
    error: string | null;
  };
}

// In-memory state persisted across requests for this Node process
interface HealthCache {
  lastResult: GeminiHealthResult | null;
  lastSuccessfulAt: string | null;
  lastCheckedTimeMs: number;
}

const cache: HealthCache = {
  lastResult: null,
  lastSuccessfulAt: null,
  lastCheckedTimeMs: 0,
};

let inFlightCheck: Promise<GeminiHealthResult> | null = null;

const DEFAULT_TIMEOUT_MS = 8000;
const MIN_CHECK_INTERVAL_MS = 4000; // Throttle to prevent upstream hammering

/**
 * Strips secrets, keys, and authorization tokens from error text.
 */
function sanitizeError(msg: string): string {
  if (!msg) return "";
  let clean = msg.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
  if (env.GEMINI_API_KEY) {
    clean = clean.replaceAll(env.GEMINI_API_KEY, "[REDACTED_API_KEY]");
  }
  if (env.TMDB_API_KEY) {
    clean = clean.replaceAll(env.TMDB_API_KEY, "[REDACTED_API_KEY]");
  }
  if (env.BASEROW_API_TOKEN) {
    clean = clean.replaceAll(env.BASEROW_API_TOKEN, "[REDACTED_API_KEY]");
  }
  return clean;
}

/**
 * Performs a lightweight live health check to the configured Gemini endpoint.
 * Sends a minimal ping request with strict timeout.
 */
export async function checkGeminiHealth(options?: {
  force?: boolean;
  timeoutMs?: number;
}): Promise<GeminiHealthResult> {
  const nowMs = Date.now();
  const force = options?.force ?? false;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Serve recent result if within throttle window and not forced
  if (!force && cache.lastResult && nowMs - cache.lastCheckedTimeMs < MIN_CHECK_INTERVAL_MS) {
    return cache.lastResult;
  }

  // Deduplicate concurrent checks
  if (inFlightCheck) {
    return inFlightCheck;
  }

  inFlightCheck = (async () => {
    const timestamp = new Date().toISOString();
    const model = env.GEMINI_MODEL || "gemini-3.7-flash";
    const baseUrl = env.GEMINI_API_BASE_URL || "https://gemini-web2api-clone.vercel.app/v1";

    // 1. Missing credentials check
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim() === "") {
      const result: GeminiHealthResult = {
        status: "offline",
        lastCheckedAt: timestamp,
        lastSuccessfulAt: cache.lastSuccessfulAt,
        latencyMs: null,
        model,
        baseUrl,
        errorCategory: "missing_credentials",
        errorMessage: "GEMINI_API_KEY is not configured in server environment",
      };
      cache.lastResult = result;
      cache.lastCheckedTimeMs = Date.now();
      return result;
    }

    // 2. Minimal live API request
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startMs = Date.now();

    try {
      const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startMs;

      // Handle HTTP errors
      if (!res.ok) {
        let category: HealthErrorCategory = "client_error";
        let message = `Upstream error (HTTP ${res.status})`;

        if (res.status === 401 || res.status === 403) {
          category = "authentication_failed";
          message = `Authentication rejected by provider (HTTP ${res.status})`;
        } else if (res.status === 429) {
          category = "rate_limited";
          message = "Upstream provider rate limit reached (HTTP 429)";
        } else if (res.status >= 500) {
          category = "service_unavailable";
          message = `Upstream service error (HTTP ${res.status})`;
        }

        const isDegraded = res.status === 429;
        const result: GeminiHealthResult = {
          status: isDegraded ? "degraded" : "offline",
          lastCheckedAt: timestamp,
          lastSuccessfulAt: cache.lastSuccessfulAt,
          latencyMs,
          model,
          baseUrl,
          errorCategory: category,
          errorMessage: sanitizeError(message),
        };

        cache.lastResult = result;
        cache.lastCheckedTimeMs = Date.now();
        return result;
      }

      // Parse JSON response
      let data: any;
      try {
        data = await res.json();
      } catch {
        const result: GeminiHealthResult = {
          status: "degraded",
          lastCheckedAt: timestamp,
          lastSuccessfulAt: cache.lastSuccessfulAt,
          latencyMs,
          model,
          baseUrl,
          errorCategory: "invalid_response",
          errorMessage: "Provider returned non-JSON response payload",
        };
        cache.lastResult = result;
        cache.lastCheckedTimeMs = Date.now();
        return result;
      }

      // Check model output structure
      const choiceContent = data?.choices?.[0]?.message?.content;
      if (typeof choiceContent !== "string") {
        const result: GeminiHealthResult = {
          status: "degraded",
          lastCheckedAt: timestamp,
          lastSuccessfulAt: cache.lastSuccessfulAt,
          latencyMs,
          model,
          baseUrl,
          errorCategory: "invalid_response",
          errorMessage: "Provider response missing valid choice completion",
        };
        cache.lastResult = result;
        cache.lastCheckedTimeMs = Date.now();
        return result;
      }

      // Latency degradation check (> 6s considered degraded)
      const isHighLatency = latencyMs > 6000;
      const status: HealthStatus = isHighLatency ? "degraded" : "operational";

      cache.lastSuccessfulAt = timestamp;
      const result: GeminiHealthResult = {
        status,
        lastCheckedAt: timestamp,
        lastSuccessfulAt: cache.lastSuccessfulAt,
        latencyMs,
        model,
        baseUrl,
        errorCategory: null,
        errorMessage: isHighLatency ? "High response latency (>6000ms)" : null,
      };

      cache.lastResult = result;
      cache.lastCheckedTimeMs = Date.now();
      return result;
    } catch (err: any) {
      const latencyMs = Date.now() - startMs;
      let category: HealthErrorCategory = "unknown_error";
      let message = "Unknown error during health check";

      if (err.name === "AbortError") {
        category = "timeout";
        message = `Request timed out after ${timeoutMs}ms`;
      } else if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.name === "TypeError") {
        category = "network_error";
        message = "Could not establish connection to provider endpoint";
      } else if (err.message) {
        message = sanitizeError(err.message);
      }

      const result: GeminiHealthResult = {
        status: "offline",
        lastCheckedAt: timestamp,
        lastSuccessfulAt: cache.lastSuccessfulAt,
        latencyMs: latencyMs >= timeoutMs ? timeoutMs : latencyMs,
        model,
        baseUrl,
        errorCategory: category,
        errorMessage: message,
      };

      cache.lastResult = result;
      cache.lastCheckedTimeMs = Date.now();
      return result;
    } finally {
      clearTimeout(timer);
    }
  })();

  try {
    return await inFlightCheck;
  } finally {
    inFlightCheck = null;
  }
}

/**
 * Optional lightweight auxiliary checks for TMDB and Baserow.
 */
export async function checkFullSystemHealth(options?: { force?: boolean }): Promise<SystemServicesHealth> {
  const gemini = await checkGeminiHealth(options);

  // TMDB check
  let tmdb: SystemServicesHealth["tmdb"] = {
    status: "unknown",
    latencyMs: null,
    error: null,
  };

  if (!env.TMDB_API_KEY) {
    tmdb = {
      status: "offline",
      latencyMs: null,
      error: "TMDB_API_KEY is not configured",
    };
  } else {
    const tmdbStart = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${env.TMDB_API_KEY}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latency = Date.now() - tmdbStart;
      if (res.ok) {
        tmdb = { status: latency > 3000 ? "degraded" : "operational", latencyMs: latency, error: null };
      } else {
        tmdb = { status: "offline", latencyMs: latency, error: `TMDB returned HTTP ${res.status}` };
      }
    } catch (err: any) {
      tmdb = { status: "offline", latencyMs: Date.now() - tmdbStart, error: err.name === "AbortError" ? "Timeout" : "Connection failed" };
    }
  }

  // Baserow check — uses the actual table row read endpoint supported by Database Tokens
  let baserow: SystemServicesHealth["baserow"] = {
    status: "unknown",
    latencyMs: null,
    error: null,
  };

  const probeTableId =
    env.BASEROW_USERS_TABLE_ID ||
    env.BASEROW_MOVIES_TABLE_ID ||
    env.BASEROW_PIRATES_TABLE_ID ||
    env.BASEROW_RECOMMENDATION_PROFILE_TABLE_ID;

  if (!env.BASEROW_API_TOKEN) {
    baserow = {
      status: "offline",
      latencyMs: null,
      error: "BASEROW_API_TOKEN not configured",
    };
  } else if (!probeTableId) {
    baserow = {
      status: "offline",
      latencyMs: null,
      error: "No Baserow table IDs configured",
    };
  } else {
    const baserowStart = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        `${env.BASEROW_API_URL.replace(/\/+$/, "")}/api/database/rows/table/${probeTableId}/?size=1&user_field_names=true`,
        {
          headers: { Authorization: `Token ${env.BASEROW_API_TOKEN}` },
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      const latency = Date.now() - baserowStart;
      if (res.ok) {
        baserow = {
          status: latency > 3000 ? "degraded" : "operational",
          latencyMs: latency,
          error: null,
        };
      } else if (res.status === 429) {
        baserow = {
          status: "degraded",
          latencyMs: latency,
          error: "Baserow API rate limit reached (HTTP 429)",
        };
      } else if (res.status === 401 || res.status === 403) {
        baserow = {
          status: "offline",
          latencyMs: latency,
          error: `Authentication rejected by Baserow (HTTP ${res.status})`,
        };
      } else {
        baserow = {
          status: "offline",
          latencyMs: latency,
          error: `Baserow returned HTTP ${res.status}`,
        };
      }
    } catch (err: any) {
      baserow = {
        status: "offline",
        latencyMs: Date.now() - baserowStart,
        error: err.name === "AbortError" ? "Request timed out" : "Connection failed",
      };
    }
  }

  return { gemini, tmdb, baserow };
}
