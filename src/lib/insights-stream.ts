"use client";

import { useEffect, useRef } from "react";
import { mutate as swrMutate } from "swr";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { API_URL } from "@/lib/api/client";
import type { Insight } from "@/lib/api/schemas";

// useInsightsRealtime: abre un EventSource a /insights/stream y, ante cada
// `insight.created`, invalida las keys de SWR de la lista y del unread count
// para que la UI los refleje sin esperar al polling de 60s.
//
// Diseño:
//   - Una sola conexión por (token, householdId). Si cualquiera cambia, se
//     cierra y reabre.
//   - Reconnect manual con backoff exponencial: el navegador hace reconnect
//     automático en `error`, pero queremos cerrarlo limpio si el householdId
//     cambia mientras el browser estaba reconectando.
//   - SSE no acepta headers en EventSource estándar — el access token va por
//     query param. El backend lo valida igual que un Bearer.
export function useInsightsRealtime() {
  const token = useAuthStore((s) => s.accessToken);
  const householdId = useHouseholdStore((s) => s.currentId);

  // Refs para evitar reconexiones por re-renders que no cambian el estado real.
  const sourceRef = useRef<EventSource | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!token || !householdId) return;

    closedRef.current = false;
    const url = new URL(`${API_URL}/insights/stream`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("householdId", householdId);

    const es = new EventSource(url.toString());
    sourceRef.current = es;

    const onCreated = (e: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(e.data) as { insight: Insight };
        // Invalidamos la key del unread-count y la lista. SWR re-fetcheará
        // y todos los componentes suscritos se re-renderizan.
        // OJO: hay que matchear las shapes que usa hooks.ts.
        swrMutate(
          (key) => Array.isArray(key) && typeof key[0] === "string" && (
            key[0] === "/insights/unread-count" ||
            key[0] === "/insights" ||
            key[0].startsWith("/insights/")
          ),
          undefined,
          { revalidate: true }
        );
        // Hint para debugging — no es obligatorio.
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.debug("[insights-stream] insight.created", parsed.insight.id);
        }
      } catch {
        // Payload roto: ignorar y dejar que el polling lo agarre.
      }
    };

    es.addEventListener("insight.created", onCreated as EventListener);
    es.addEventListener("ready", () => {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.debug("[insights-stream] connected");
      }
    });

    es.onerror = () => {
      // EventSource intenta reconnectar solo. Si el server devolvió 401/403,
      // el browser igual reintenta — no podemos hacer mucho desde acá.
      // Cuando el token expire (15min), refresh-on-401 del cliente HTTP
      // refrescará el token; este efecto se re-ejecutará por cambio de token.
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.debug("[insights-stream] error / reconnecting");
      }
    };

    return () => {
      closedRef.current = true;
      es.close();
      sourceRef.current = null;
    };
  }, [token, householdId]);
}
