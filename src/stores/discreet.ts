"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { formatAmount, maskAmountsInText, maskedAmount, type MoneyCents } from "@/lib/format";
import { useIsClient } from "@/lib/hooks";
import { STORAGE_KEYS } from "@/lib/storage-keys";

// Discreet mode (plan 1.9): one tap hides every amount in the app. It is a
// per-device choice, so it lives in localStorage and never reaches the API.

type DiscreetState = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

export const useDiscreetStore = create<DiscreetState>()(
  persist(
    (set) => ({
      hidden: false,
      setHidden: (hidden) => set({ hidden }),
    }),
    {
      name: STORAGE_KEYS.discreet,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ hidden: s.hidden }),
    },
  ),
);

/**
 * True when amounts must be hidden. Server render and the first client
 * render always say false, so hydration matches; amounts come from the API
 * after that anyway.
 */
export function useDiscreet(): boolean {
  const hidden = useDiscreetStore((s) => s.hidden);
  return useIsClient() && hidden;
}

type AmountOpts = { cents?: MoneyCents; income?: boolean; compact?: boolean };

/**
 * For amounts that end up inside a string (chart tooltips, aria-labels,
 * toasts). In JSX prefer `<Money>`, which also labels a hidden amount.
 */
export function useFormatAmount() {
  const hidden = useDiscreet();
  return (amount: number, currency = "ARS", opts: AmountOpts = {}) =>
    hidden ? maskedAmount(currency) : formatAmount(amount, currency, opts);
}

/** Masks the amounts inside API text (notification titles and bodies). */
export function useMaskText() {
  const hidden = useDiscreet();
  return (text: string) => (hidden ? maskAmountsInText(text) : text);
}
