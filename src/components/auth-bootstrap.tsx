"use client";

import { useEffect } from "react";
import { refresh, getMe } from "@/lib/api/auth";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import type { Household } from "@/lib/api/schemas";

/** Runs once on mount: tries to recover session via the refresh cookie. */
export function AuthBootstrap() {
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const setHouseholdId = useHouseholdStore((s) => s.setCurrentId);
  const currentHouseholdId = useHouseholdStore((s) => s.currentId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await refresh();
        if (cancelled) return;
        setToken(r.accessToken, r.accessExpiresAt);

        const [me, households] = await Promise.all([
          getMe(r.accessToken),
          apiFetch<Household[]>({ path: "/households", token: r.accessToken }),
        ]);
        if (cancelled) return;
        setUser(me);
        if (!currentHouseholdId && households.length > 0) {
          setHouseholdId(households[0].id);
        }
      } catch {
        // No active session — public state.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setToken, setUser, setHydrated, setHouseholdId, currentHouseholdId]);

  return null;
}
