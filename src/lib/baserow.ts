import { env } from "./env";
import { logger } from "./logger";

interface BaserowListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const defaultHeaders = {
  Authorization: `Token ${env.BASEROW_API_TOKEN}`,
  "Content-Type": "application/json",
};

/**
 * Baserow single_select fields return objects like { id, value, color }.
 * This normalizer flattens them to plain string values so our app
 * can work with them transparently.
 */
function normalizeRow<T>(row: any): T {
  const normalized: any = {};
  for (const [key, val] of Object.entries(row)) {
    if (val && typeof val === "object" && !Array.isArray(val) && "value" in (val as any)) {
      normalized[key] = (val as any).value;
    } else {
      normalized[key] = val;
    }
  }
  return normalized as T;
}

/**
 * Retry-aware fetch wrapper. Retries on network errors and 429/5xx responses.
 * Uses exponential backoff: 500ms, 1000ms, 2000ms.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const fetchOptions: RequestInit = {
        ...options,
        cache: "no-store", // Prevent Next.js from aggressively caching Baserow database calls
      };
      const start = Date.now();
      const response = await fetch(url, fetchOptions);
      const durationMs = Date.now() - start;

      // Retry on server errors or rate limiting
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        logger.warn({ module: "baserow", action: "FETCH_RETRY", status: "FAILED", durationMs, message: `Retrying Baserow request: ${response.status} on ${url}` });
        const delay = 500 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      
      logger.debug({ module: "baserow", action: "FETCH", status: "SUCCESS", durationMs, message: `Baserow request succeeded: ${response.status} on ${url}` });

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        logger.warn({ module: "baserow", action: "FETCH_RETRY", status: "FAILED", error: lastError, message: `Retrying Baserow request on error for ${url}` });
        const delay = 500 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error("fetchWithRetry: all retries exhausted");
}

export async function baserowGetAll<T>(tableId: string, queryParams: Record<string, string> = {}): Promise<T[]> {
  let allResults: T[] = [];
  const url = new URL(`${env.BASEROW_API_URL}/api/database/rows/table/${tableId}/`);
  url.searchParams.append("user_field_names", "true");
  url.searchParams.append("size", "200"); // Maximum allowed size per request
  
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.append(key, value);
  }

  let currentUrl: string | null = url.toString();

  while (currentUrl) {
    const response = await fetchWithRetry(currentUrl, {
      method: "GET",
      headers: defaultHeaders,
    });

    if (!response.ok) {
      const msg = `Baserow GET Error: ${response.status} ${response.statusText}`;
      logger.error({ module: "baserow", action: "GET_ALL", status: "FAILED", message: msg, tableId });
      throw new Error(msg);
    }

    const data = await response.json();
    const normalizedResults = data.results.map((row: any) => normalizeRow<T>(row));
    allResults = allResults.concat(normalizedResults);

    currentUrl = data.next;
  }

  return allResults;
}

export async function baserowCreate<T>(tableId: string, data: Record<string, any>): Promise<T> {
  const url = new URL(`${env.BASEROW_API_URL}/api/database/rows/table/${tableId}/?user_field_names=true`);

  const response = await fetchWithRetry(url.toString(), {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const msg = `Baserow POST Error: ${response.status} ${response.statusText}`;
    logger.error({ module: "baserow", action: "CREATE", status: "FAILED", message: msg, tableId });
    throw new Error(msg);
  }

  const result = await response.json();
  return normalizeRow<T>(result);
}

export async function baserowUpdate<T>(tableId: string, rowId: number, data: Record<string, any>): Promise<T> {
  const url = new URL(`${env.BASEROW_API_URL}/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`);

  const response = await fetchWithRetry(url.toString(), {
    method: "PATCH",
    headers: defaultHeaders,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const msg = `Baserow PATCH Error: ${response.status} ${response.statusText}`;
    logger.error({ module: "baserow", action: "UPDATE", status: "FAILED", message: msg, tableId, rowId });
    throw new Error(msg);
  }

  const result = await response.json();
  return normalizeRow<T>(result);
}

export async function baserowDelete(tableId: string, rowId: number): Promise<void> {
  const url = new URL(`${env.BASEROW_API_URL}/api/database/rows/table/${tableId}/${rowId}/`);

  const response = await fetchWithRetry(url.toString(), {
    method: "DELETE",
    headers: defaultHeaders,
  });

  if (!response.ok) {
    const msg = `Baserow DELETE Error: ${response.status} ${response.statusText}`;
    logger.error({ module: "baserow", action: "DELETE", status: "FAILED", message: msg, tableId, rowId });
    throw new Error(msg);
  }
}
