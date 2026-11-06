"use client";

import { useEffect } from "react";
import { mutate as swrMutate } from "swr";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { API_URL } from "@/lib/api/client";
import { requestStreamTicket } from "@/lib/api/mutations";
import type { Insight } from "@/lib/api/schemas";

// useInsightsRealtime: keeps an EventSource on /insights/stream and, on each
// `insight.created`, revalidates the insight lists and the unread count so the
// UI shows them without waiting for the polling fallback.
//
// EventSource cannot send headers, so each connection first asks for a
// single-use ticket (POST /insights/stream-ticket, valid 60 s) and opens the
// stream with it (plan 0.9; the access token no longer goes in the URL).
// Because a ticket works once, the browser's own reconnect (same URL) would
// fail: on any error we close the stream and reconnect with a new ticket,
// backing off 1 s, 2 s, 4 s ... up to 30 s, and back to 1 s once connected.
// One connection per (token, household); a change of either reconnects.
export function useInsightsRealtime() {
  const token = useAuthStore((s) => s.accessToken);
  const householdId = useHouseholdStore((s) => s.currentId);

  useEffect(() => {
    if (!token || !householdId) return;

    let cancelled = false;
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

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
          console.debug("[insights-stream] insight.created", parsed.insight.id);
        }
      } catch {
        // Payload roto: ignorar y dejar que el polling lo agarre.
      }
    };

    const schedule = () => {
      if (cancelled) return;
      const delay = Math.min(30_000, 1000 * 2 ** attempt);
      attempt += 1;
      retry = setTimeout(() => void connect(), delay);
    };

    const connect = async () => {
      let ticket: string;
      try {
        ({ ticket } = await requestStreamTicket());
      } catch {
        schedule();
        return;
      }
      if (cancelled) return;
      const url = new URL(`${API_URL}/insights/stream`);
      url.searchParams.set("ticket", ticket);
      const source = new EventSource(url.toString());
      es = source;
      source.addEventListener("insight.created", onCreated as EventListener);
      source.addEventListener("ready", () => {
        attempt = 0;
        if (process.env.NODE_ENV !== "production") {
          console.debug("[insights-stream] connected");
        }
      });
      source.onerror = () => {
        // The ticket is spent: drop this source and come back with a new one.
        source.close();
        if (es === source) es = null;
        if (process.env.NODE_ENV !== "production") {
          console.debug("[insights-stream] error / reconnecting");
        }
        schedule();
      };
    };

    void connect();

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      es?.close();
      es = null;
    };
  }, [token, householdId]);
}
