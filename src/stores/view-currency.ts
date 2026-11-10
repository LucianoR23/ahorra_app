"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useIsClient } from "@/lib/hooks";
import { STORAGE_KEYS } from "@/lib/storage-keys";

// "Ver en dólares" (plan 5.3): Inicio and Reportes in pesos or dollars. A
// per-device choice, like discreet mode.

type ViewCurrencyState = {
  usd: boolean;
  /** Convert at today's dollar instead of each movement's day. */
  today: boolean;
  setUsd: (usd: boolean) => void;
  setToday: (today: boolean) => void;
};

export const useViewCurrencyStore = create<ViewCurrencyState>()(
  persist(
    (set) => ({
      usd: false,
      today: false,
      setUsd: (usd) => set({ usd }),
      setToday: (today) => set({ today }),
    }),
    {
      name: STORAGE_KEYS.viewCurrency,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ usd: s.usd, today: s.today }),
    },
  ),
);

/** What reports ask for. Pesos on the server and first client render. */
export function useViewCurrency(): { usd: boolean; today: boolean } {
  const isClient = useIsClient();
  const usd = useViewCurrencyStore((s) => s.usd);
  const today = useViewCurrencyStore((s) => s.today);
  return { usd: isClient && usd, today: isClient && usd && today };
}

/** The reports query for the current view. */
export function viewQuery(view: { usd: boolean; today: boolean }): Record<string, string> {
  if (!view.usd) return {};
  return view.today ? { currency: "USD", rate: "today" } : { currency: "USD" };
}
