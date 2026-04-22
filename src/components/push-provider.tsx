"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import {
  fetchVapidPublicKey,
  registerServiceWorker,
  subscribeToPush,
  sendSubscriptionToBackend,
  isStandalone,
  isIosSafari,
} from "@/lib/push";

const DISMISSED_KEY = "ahorra.push.dismissed";

/**
 * Drop this inside the Dashboard (authenticated context only).
 * Handles SW registration, silent subscribe, and the opt-in banner.
 */
export function PushProvider() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [banner, setBanner] = useState<"push" | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!banner) return;
    rafRef.current = requestAnimationFrame(() => setExpanded(true));
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [banner]);

  const initPush = useCallback(async () => {
    if (!accessToken) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (isIosSafari() && !isStandalone()) return; // install-prompt handles the iOS install flow

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // Fetch VAPID key — if empty, server push is not enabled
    const vapidKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      (await fetchVapidPublicKey());
    if (!vapidKey) return;

    const reg = await registerServiceWorker();
    if (!reg) return;

    const permission = Notification.permission;

    if (permission === "granted") {
      // Silent subscribe (already allowed)
      const sub = await subscribeToPush(reg, vapidKey);
      if (sub) await sendSubscriptionToBackend(sub, accessToken);
      return;
    }

    if (permission === "default") {
      const dismissed = sessionStorage.getItem(DISMISSED_KEY);
      if (!dismissed) {
        // Show banner after a short delay so the page feels settled
        setTimeout(() => setBanner("push"), 3000);
      }
    }
    // permission === "denied" → silently skip
  }, [accessToken]);

  useEffect(() => {
    const timer = setTimeout(() => { void initPush(); }, 0);
    return () => clearTimeout(timer);
  }, [initPush]);

  async function handleAllow() {
    if (!accessToken) return;
    setSubscribing(true);
    try {
      const vapidKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        (await fetchVapidPublicKey());
      if (!vapidKey) { setBanner(null); return; }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setBanner(null); return; }

      const reg = await registerServiceWorker();
      if (!reg) { setBanner(null); return; }

      const sub = await subscribeToPush(reg, vapidKey);
      if (sub) await sendSubscriptionToBackend(sub, accessToken);
    } finally {
      setSubscribing(false);
      setBanner(null);
    }
  }

  function dismissPush() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setBanner(null);
  }

  if (!banner) return null;

  return (
    <div
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out",
        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        {banner === "push" && (
          <div className="flex items-start gap-3 rounded-2xl bg-primary/10 px-4 py-3 text-primary ring-1 ring-primary/20">
            <Bell className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">Activá las notificaciones</p>
              <p className="mt-0.5 text-[11px] text-primary/80">
                Recibí alertas cuando alguien cargue un gasto compartido o registre un pago.
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAllow}
                  disabled={subscribing}
                  className="h-7 text-[11px]"
                >
                  {subscribing ? "Activando…" : "Activar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={dismissPush}
                  className="h-7 text-[11px] text-primary/70"
                >
                  Ahora no
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissPush}
              aria-label="Cerrar"
              className="shrink-0 cursor-pointer text-primary/50 transition-colors hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
