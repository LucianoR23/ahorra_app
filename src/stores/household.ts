"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type HouseholdState = {
  currentId: string | null;
  setCurrentId: (id: string | null) => void;
};

export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set) => ({
      currentId: null,
      setCurrentId: (currentId) => set({ currentId }),
    }),
    {
      name: "ahorro.household",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getCurrentHouseholdId() {
  return useHouseholdStore.getState().currentId;
}
