import { env } from "./env";

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
      const response = await fetch(url, fetchOptions);

      // Retry on server errors or rate limiting
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        const delay = 500 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        const delay = 500 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error("fetchWithRetry: all retries exhausted");
}

export async function baserowGet<T>(tableId: string, queryParams: Record<string, string> = {}): Promise<BaserowListResponse<T>> {
  const url = new URL(`${env.BASEROW_API_URL}/api/database/rows/table/${tableId}/`);
  url.searchParams.append("user_field_names", "true");
  
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.append(key, value);
  }

  const response = await fetchWithRetry(url.toString(), {
    method: "GET",
    headers: defaultHeaders,
  });

  if (!response.ok) {
    throw new Error(`Baserow GET Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    ...data,
    results: data.results.map((row: any) => normalizeRow<T>(row)),
  };
}

export async function baserowCreate<T>(tableId: string, data: Record<string, any>): Promise<T> {
  const url = new URL(`${env.BASEROW_API_URL}/api/database/rows/table/${tableId}/?user_field_names=true`);

  const response = await fetchWithRetry(url.toString(), {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Baserow POST Error: ${response.status} ${response.statusText}`);
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
    throw new Error(`Baserow PATCH Error: ${response.status} ${response.statusText}`);
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
    throw new Error(`Baserow DELETE Error: ${response.status} ${response.statusText}`);
  }
}
