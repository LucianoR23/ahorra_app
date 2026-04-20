import { ApiError } from "./errors";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api-ahorra.lemydev.com";

export type ApiRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  /** Bearer access token. Omit for public endpoints (auth/*). */
  token?: string | null;
  /** Forwarded as X-Household-ID. */
  householdId?: string | null;
  /** Sent as JSON body. Skip for GET. */
  body?: unknown;
  /** Append to query string. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Default true. Required so the refresh cookie travels. */
  credentials?: RequestCredentials;
  signal?: AbortSignal;
};

export async function apiFetch<T = unknown>(req: ApiRequest): Promise<T> {
  const url = new URL(req.path.startsWith("http") ? req.path : `${API_URL}${req.path}`);
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (req.body !== undefined) headers["Content-Type"] = "application/json";
  if (req.token) headers["Authorization"] = `Bearer ${req.token}`;
  if (req.householdId) headers["X-Household-ID"] = req.householdId;

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: req.method ?? "GET",
      headers,
      credentials: req.credentials ?? "include",
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      signal: req.signal,
      cache: "no-store",
    });
  } catch (e) {
    throw ApiError.network(e instanceof Error ? e.message : "fetch failed");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? safeJson(text) : null;

  if (!res.ok) throw ApiError.fromResponse(res.status, json);
  return json as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
