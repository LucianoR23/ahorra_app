"use client";

import { useEffect, useState } from "react";
import { mutate as swrMutate } from "swr";
import { Loader2, Smartphone, Monitor, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuGroup, MenuRow } from "@/components/ui/menu-list";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePushSubscriptions } from "@/lib/api/hooks";
import { deletePushSubscriptionById } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { toast, toastError } from "@/lib/toast";
import { confirm } from "@/lib/confirm";

function parseUserAgent(ua?: string): { label: string; isMobile: boolean } {
  if (!ua) return { label: "Dispositivo desconocido", isMobile: false };
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  let browser = "Navegador";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  else if (/OPR\//.test(ua)) browser = "Opera";

  let os = "";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  return {
    label: os ? `${browser} en ${os}` : browser,
    isMobile,
  };
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace un instante";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d}d`;
  return new Date(iso).toLocaleDateString();
}

export function DevicesCard() {
  const { data: subs, isLoading } = usePushSubscriptions();
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) setCurrentEndpoint(sub.endpoint);
    })();
  }, []);

  async function handleRevoke(id: string) {
    const ok = await confirm({
      title: "¿Cerrar sesión de este dispositivo?",
      confirmLabel: "Cerrar sesión",
      destructive: true,
    });
    if (!ok) return;
    setRevokingId(id);
    try {
      await deletePushSubscriptionById(id);
      swrMutate(
        (k) =>
          Array.isArray(k) &&
          typeof k[0] === "string" &&
          k[0].startsWith("/push/subscriptions"),
        undefined,
        { revalidate: true },
      );
      toast.success("Dispositivo desconectado");
    } catch (e) {
      if (e instanceof ApiError && e.code === "not_found") {
        toast.info("El dispositivo ya había sido desconectado");
        swrMutate(
          (k) =>
            Array.isArray(k) &&
            typeof k[0] === "string" &&
            k[0].startsWith("/push/subscriptions"),
          undefined,
          { revalidate: true },
        );
      } else {
        toastError(e);
      }
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <MenuGroup title="Dispositivos con notificaciones">
      {isLoading ? (
        <MenuRow>
          <Skeleton className="h-10 w-full" />
        </MenuRow>
      ) : !subs || subs.length === 0 ? (
        <MenuRow className="text-ink-muted">Ninguno todavía. Activá las notificaciones y este dispositivo aparece acá.</MenuRow>
      ) : (
        subs.map((s) => {
          const { label, isMobile } = parseUserAgent(s.userAgent);
          const isCurrent = !!currentEndpoint && s.endpoint === currentEndpoint;
          const Icon = isMobile ? Smartphone : Monitor;
          return (
            <MenuRow key={s.id}>
              <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="truncate">{label}</span>
                  {isCurrent && <Badge variant="secondary">Este dispositivo</Badge>}
                </p>
                <p className="text-caption text-ink-muted">Último uso: {formatRelative(s.lastSeenAt)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRevoke(s.id)}
                disabled={revokingId === s.id}
                aria-label={`Desconectar ${label}`}
                className="text-ink-muted hover:bg-negative-soft hover:text-negative"
              >
                {revokingId === s.id ? <Loader2 aria-hidden className="animate-spin" /> : <Trash2 aria-hidden strokeWidth={1.75} />}
              </Button>
            </MenuRow>
          );
        })
      )}
    </MenuGroup>
  );
}
