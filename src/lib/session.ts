"use client";

import { mutate } from "swr";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";

/**
 * Cache Storage names that hold the app itself, not data. The precache is
 * what opens the app offline, so it survives a logout.
 */
function isAppShellCache(name: string): boolean {
  return name.includes("precache");
}

/**
 * Forgets everything this device knows about the signed-in user (plan 0.13):
 * the session, the current household (memory and localStorage), every SWR
 * response and the service worker's runtime caches. Device preferences
 * (theme, remembered e-mail, dismissed prompts) stay.
 *
 * Call it after the API has ended the session (logout, logout-all, account
 * deletion). It never throws: a storage that can't be cleared must not keep
 * the user signed in.
 */
export async function clearLocalSession(): Promise<void> {
  useAuthStore.getState().clear();
  useHouseholdStore.getState().setCurrentId(null);
  useHouseholdStore.getState().markResolved(null);
  try {
    useHouseholdStore.persist.clearStorage();
  } catch {
    // Storage disabled: nothing was persisted.
  }
  // Drops every key from the SWR cache without refetching.
  await mutate(() => true, undefined, { revalidate: false });
  if (typeof caches === "undefined") return;
  try {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !isAppShellCache(n)).map((n) => caches.delete(n)));
  } catch {
    // Cache Storage unavailable (private mode, insecure origin).
  }
}
