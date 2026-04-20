"use client";

import { apiFetch, type ApiRequest } from "./client";
import { ApiError } from "./errors";
import { refresh } from "./auth";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";

export type SwrKey =
  | string
  | readonly [path: string, opts?: { query?: ApiRequest["query"]; householdScoped?: boolean }];

let refreshInflight: Promise<string | null> | null = null;

async function refreshOnce(): Promise<string | null> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    try {
      const r = await refresh();
      useAuthStore.getState().setToken(r.accessToken, r.accessExpiresAt);
      return r.accessToken;
    } catch {
      useAuthStore.getState().clear();
      return null;
    } finally {
      refreshInflight = null;
    }
  })();
  return refreshInflight;
}

/**
 * SWR fetcher: pulls token + householdId from stores, retries once on 401
 * after refreshing the access token.
 */
export async function swrFetcher<T = unknown>(key: SwrKey): Promise<T> {
  const [path, opts] = Array.isArray(key) ? key : ([key, undefined] as const);
  const householdScoped = opts?.householdScoped ?? true;

  const token = useAuthStore.getState().accessToken;
  const householdId = householdScoped ? useHouseholdStore.getState().currentId : null;

  const doFetch = (tk: string | null) =>
    apiFetch<T>({
      path,
      token: tk,
      householdId,
      query: opts?.query,
    });

  try {
    return await doFetch(token);
  } catch (e) {
    if (e instanceof ApiError && e.code === "unauthorized") {
      const fresh = await refreshOnce();
      if (!fresh) throw e;
      return await doFetch(fresh);
    }
    throw e;
  }
}
