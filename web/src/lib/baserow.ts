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

export async function baserowGet<T>(tableId: string, queryParams: Record<string, string> = {}): Promise<BaserowListResponse<T>> {
  const url = new URL(`${env.BASEROW_API_URL}/api/database/rows/table/${tableId}/`);
  url.searchParams.append("user_field_names", "true");
  
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.append(key, value);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: defaultHeaders,
  });

  if (!response.ok) {
    throw new Error(`Baserow GET Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function baserowCreate<T>(tableId: string, data: Record<string, any>): Promise<T> {
  const url = new URL(`${env.BASEROW_API_URL}/api/database/rows/table/${tableId}/?user_field_names=true`);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Baserow POST Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function baserowUpdate<T>(tableId: string, rowId: number, data: Record<string, any>): Promise<T> {
  const url = new URL(`${env.BASEROW_API_URL}/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`);

  const response = await fetch(url.toString(), {
    method: "PATCH",
    headers: defaultHeaders,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Baserow PATCH Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function baserowDelete(tableId: string, rowId: number): Promise<void> {
  const url = new URL(`${env.BASEROW_API_URL}/api/database/rows/table/${tableId}/${rowId}/`);

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: defaultHeaders,
  });

  if (!response.ok) {
    throw new Error(`Baserow DELETE Error: ${response.status} ${response.statusText}`);
  }
}
