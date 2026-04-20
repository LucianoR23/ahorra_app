"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `true` después de la hidratación en el cliente, `false` durante SSR.
 * Usa `useSyncExternalStore` para evitar setState-in-effect.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
