"use client";

import { mutate } from "swr";
import { useHouseholds } from "@/lib/api/hooks";
import { useHouseholdStore } from "@/stores/household";

/**
 * The user's spaces (plan 1.2): "Mi plata" (always there) and, at most, one
 * "Hogar". `current` is the space every screen reads; it falls back to
 * "Mi plata" while the stored id is unknown. An account from before the
 * one-hogar rule may have several shared households: the oldest one wins
 * (the API lists them by age).
 */
export function useSpaces() {
  const { data: households, isLoading } = useHouseholds();
  const currentId = useHouseholdStore((s) => s.currentId);
  const personal = households?.find((h) => h.kind === "personal");
  const hogar = households?.find((h) => h.kind === "shared");
  const current = households?.find((h) => h.id === currentId) ?? personal;
  return {
    personal,
    hogar,
    current,
    /** True when the screens are showing the hogar. */
    inHogar: current?.kind === "shared",
    isLoading,
  };
}

/** Switches the space every screen reads and refetches their data. */
export function selectSpace(id: string) {
  if (useHouseholdStore.getState().currentId === id) return;
  useHouseholdStore.getState().setCurrentId(id);
  // Household-scoped keys don't carry the id: drop them all and refetch.
  mutate(() => true, undefined, { revalidate: true });
}
