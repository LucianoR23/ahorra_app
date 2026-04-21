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
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setHouseholdId = useHouseholdStore((s) => s.setCurrentId);
  const currentHouseholdId = useHouseholdStore((s) => s.currentId);

  // Initial session recovery via refresh cookie.
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
        if (!useHouseholdStore.getState().currentId && households.length > 0) {
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
  }, [setToken, setUser, setHydrated, setHouseholdId]);

  // When the user logs in via form (user + token present but no current household),
  // fetch households and set the first one as current.
  useEffect(() => {
    if (!user || !accessToken || currentHouseholdId) return;
    let cancelled = false;
    (async () => {
      try {
        const households = await apiFetch<Household[]>({ path: "/households", token: accessToken });
        if (cancelled) return;
        if (households.length > 0 && !useHouseholdStore.getState().currentId) {
          setHouseholdId(households[0].id);
        }
      } catch {
        // ignore — onboarding flow will handle creation
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, currentHouseholdId, setHouseholdId]);

  return null;
}
