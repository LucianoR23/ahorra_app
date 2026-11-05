"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/storage-keys";

type HouseholdState = {
  currentId: string | null;
  /**
   * Id of the user whose households were fetched and reconciled with
   * `currentId`. Until it matches the logged-in user, "no household" is
   * unknown, not a fact: route guards must wait instead of sending the user
   * to /onboarding. Not persisted.
   */
  resolvedFor: string | null;
  setCurrentId: (id: string | null) => void;
  markResolved: (userId: string | null) => void;
};

export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set) => ({
      currentId: null,
      resolvedFor: null,
      setCurrentId: (currentId) => set({ currentId }),
      markResolved: (resolvedFor) => set({ resolvedFor }),
    }),
    {
      name: STORAGE_KEYS.household,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ currentId: s.currentId }),
    },
  ),
);

/** True once the households of `userId` are known (see `resolvedFor`). */
export function useHouseholdsResolved(userId: string | undefined) {
  return useHouseholdStore((s) => userId !== undefined && s.resolvedFor === userId);
}
