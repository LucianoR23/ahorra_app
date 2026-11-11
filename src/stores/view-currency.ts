"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useIsClient } from "@/lib/hooks";
import { STORAGE_KEYS } from "@/lib/storage-keys";

// "Ver en" (plan 5.3, 5.6): Inicio and Reportes in pesos or another
// currency, view only. A per-device choice, like discreet mode.

type ViewCurrencyState = {
  /** "ARS", or a code of VIEW_CURRENCIES (lib/fx). */
  currency: string;
  /** The dollar at today's rate instead of each movement's day. */
  today: boolean;
  setCurrency: (currency: string) => void;
  setToday: (today: boolean) => void;
};

/** Version 0 stored `usd: boolean` (plan 5.3). */
type V0 = { usd?: boolean; today?: boolean };

export const useViewCurrencyStore = create<ViewCurrencyState>()(
  persist(
    (set) => ({
      currency: "ARS",
      today: false,
      setCurrency: (currency) => set({ currency }),
      setToday: (today) => set({ today }),
    }),
    {
      name: STORAGE_KEYS.viewCurrency,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persisted, version) => {
        if (version === 0) {
          const old = (persisted ?? {}) as V0;
          return { currency: old.usd ? "USD" : "ARS", today: !!old.today };
        }
        return persisted as Pick<ViewCurrencyState, "currency" | "today">;
      },
      partialize: (s) => ({ currency: s.currency, today: s.today }),
    },
  ),
);

export type View = {
  /** "ARS" or the currency picked. */
  currency: string;
  /** Not pesos: Tarjetas and Deudas warn they stay in pesos. */
  foreign: boolean;
  /** Only the dollar converts day by day or at today's rate. */
  today: boolean;
};

/** What reports ask for. Pesos on the server and first client render. */
export function useViewCurrency(): View {
  const isClient = useIsClient();
  const stored = useViewCurrencyStore((s) => s.currency);
  const today = useViewCurrencyStore((s) => s.today);
  const currency = isClient && stored ? stored : "ARS";
  const foreign = currency !== "ARS";
  return { currency, foreign, today: foreign && currency === "USD" && today };
}

/** The reports query for the current view. */
export function viewQuery(view: View): Record<string, string> {
  if (!view.foreign) return {};
  if (view.currency === "USD" && view.today) return { currency: "USD", rate: "today" };
  return { currency: view.currency };
}
