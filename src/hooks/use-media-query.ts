"use client"

import { useSyncExternalStore } from "react"

/**
 * Evalúa una media query de forma reactiva y SSR-safe.
 *
 * Usa `useSyncExternalStore` en vez de `useState` + `useEffect`: evita el flash
 * de hidratación y es la forma idiomática en React 19 de suscribirse a un store
 * externo (aquí, `window.matchMedia`). En el servidor devuelve siempre el valor
 * de `getServerSnapshot` (mobile-first → `false`).
 *
 * El closure de `subscribe` queda estabilizado por el React Compiler con `query`
 * como dependencia, por lo que solo se re-suscribe si cambia la query.
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 768px)")
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}
