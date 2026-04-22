"use client";

import { useEffect, useRef } from "react";
import { refresh, getMe } from "@/lib/api/auth";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import type { Household } from "@/lib/api/schemas";

// Refresh silencioso: agendamos un refresh 60s antes de que expire el access
// token. Evita 401s en requests activos y mantiene la sesión viva sin depender
// de que el usuario dispare una acción.
const REFRESH_LEAD_MS = 60_000;
// Piso para no caer en un bucle si el token ya está vencido/por vencer.
const REFRESH_MIN_MS = 5_000;

/** Runs once on mount: tries to recover session via the refresh cookie. */
export function AuthBootstrap() {
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const clearAuth = useAuthStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const accessExpiresAt = useAuthStore((s) => s.accessExpiresAt);
  const setHouseholdId = useHouseholdStore((s) => s.setCurrentId);

  // Evita que StrictMode (dev) o remounts rápidos disparen dos refresh en
  // paralelo, lo que contra un backend con rotación estricta invalida la
  // cookie buena y deslogea al usuario al recargar.
  const bootstrapped = useRef(false);

  // Initial session recovery via refresh cookie.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

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
        const storedId = useHouseholdStore.getState().currentId;
        const storedIsValid = storedId ? households.some((h) => h.id === storedId) : false;
        if (!storedIsValid) {
          setHouseholdId(households.length > 0 ? households[0].id : null);
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

  // When the user logs in via form, fetch households and reconcile the stored
  // currentHouseholdId — if it's stale (doesn't belong to this user), fall back
  // to the first household or null so AuthGate can route to /onboarding.
  useEffect(() => {
    if (!user || !accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const households = await apiFetch<Household[]>({ path: "/households", token: accessToken });
        if (cancelled) return;
        const storedId = useHouseholdStore.getState().currentId;
        const storedIsValid = storedId ? households.some((h) => h.id === storedId) : false;
        if (!storedIsValid) {
          setHouseholdId(households.length > 0 ? households[0].id : null);
        }
      } catch {
        // ignore — onboarding flow will handle creation
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, setHouseholdId]);

  // Silent refresh programado: se re-agenda cada vez que cambia
  // accessExpiresAt. Si el tab estuvo en background y se pasó el tiempo,
  // refresheamos apenas vuelve a primer plano.
  useEffect(() => {
    if (!accessToken || !accessExpiresAt) return;

    const runRefresh = async () => {
      try {
        const r = await refresh();
        setToken(r.accessToken, r.accessExpiresAt);
      } catch {
        // Refresh falló — sesión perdida. Limpiamos para que AuthGate
        // mande a /login en vez de dejar al usuario en un estado raro.
        clearAuth();
        useHouseholdStore.getState().setCurrentId(null);
      }
    };

    const expiresMs = new Date(accessExpiresAt).getTime();
    const delay = Math.max(REFRESH_MIN_MS, expiresMs - Date.now() - REFRESH_LEAD_MS);
    const timer = setTimeout(runRefresh, delay);

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      // Si el tab volvió y ya estamos dentro de la ventana de refresh,
      // disparamos manualmente (el setTimeout puede haberse atrasado).
      if (Date.now() >= expiresMs - REFRESH_LEAD_MS) {
        clearTimeout(timer);
        void runRefresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [accessToken, accessExpiresAt, setToken, clearAuth]);

  return null;
}
