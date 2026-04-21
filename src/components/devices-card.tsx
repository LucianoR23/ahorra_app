"use client";

import { useEffect, useState } from "react";
import { mutate as swrMutate } from "swr";
import { Loader2, Smartphone, Monitor, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePushSubscriptions } from "@/lib/api/hooks";
import { deletePushSubscriptionById } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { toast, toastError } from "@/lib/toast";

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
    label: os ? `${browser} • ${os}` : browser,
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
    if (!confirm("¿Cerrar sesión de este dispositivo?")) return;
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
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4">
        <div className="mb-4">
          <h2 className="text-sm font-bold">Mis dispositivos</h2>
          <p className="text-[11px] text-muted-foreground">
            Dispositivos con notificaciones push activas.
          </p>
        </div>

        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-md" />
        ) : !subs || subs.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No hay dispositivos suscriptos. Activá las notificaciones para ver tus dispositivos
            acá.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {subs.map((s) => {
              const { label, isMobile } = parseUserAgent(s.userAgent);
              const isCurrent = !!currentEndpoint && s.endpoint === currentEndpoint;
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2"
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    {isMobile ? (
                      <Smartphone className="size-4" />
                    ) : (
                      <Monitor className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold">{label}</p>
                      {isCurrent && (
                        <Badge
                          variant="outline"
                          className="h-4 border-primary/30 bg-primary/10 px-1.5 text-[9px] text-primary"
                        >
                          Este dispositivo
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Último uso: {formatRelative(s.lastSeenAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(s.id)}
                    disabled={revokingId === s.id}
                    aria-label="Desconectar dispositivo"
                    className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    {revokingId === s.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
