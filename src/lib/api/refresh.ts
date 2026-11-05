"use client";

import { refresh } from "./auth";
import { useAuthStore } from "@/stores/auth";

// One refresh at a time for the whole app (plan 0.15b: this used to be copied
// in three places). Every caller (SWR reads, mutations, the scheduled silent
// refresh) shares the in-flight call, so a rotating refresh token is never
// spent twice in parallel.
let refreshInflight: Promise<string | null> | null = null;

/**
 * Refreshes the access token through the refresh cookie and stores it.
 * Resolves to the new token, or null after clearing the session when the
 * refresh fails.
 */
export async function refreshOnce(): Promise<string | null> {
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
