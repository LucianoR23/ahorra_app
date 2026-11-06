"use client";

import { History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivity, type ActivityItem } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

/** Spanish labels for the API's audit actions (plan 0.17). */
const LABELS: Record<string, string> = {
  "login.success": "Inicio de sesión",
  "login.failed": "Intento de inicio de sesión fallido",
  "login.new_device": "Inicio de sesión desde un dispositivo nuevo",
  logout: "Cerraste sesión",
  "logout.all": "Cerraste sesión en todos los dispositivos",
  "password.changed": "Cambiaste tu contraseña",
  "password.reset": "Restableciste tu contraseña",
  "email.change_requested": "Pediste cambiar tu email",
  "email.changed": "Cambiaste tu email",
  "household.joined": "Te uniste a un hogar",
  "household.member_removed": "Saliste de un hogar o te quitaron",
  "household.role_changed": "Cambió el dueño de un hogar",
};

/** Events worth a second look are highlighted. */
const ALERT = new Set(["login.failed", "login.new_device"]);

const fmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function activityLabel(item: ActivityItem): string {
  return LABELS[item.action] ?? "Actividad de la cuenta";
}

export function ActivityCard() {
  const { data, isLoading } = useActivity();
  const items = data?.items ?? [];

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
            <History className="size-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Actividad reciente</h2>
            <p className="text-[11px] text-muted-foreground">
              Inicios de sesión y cambios de seguridad de tu cuenta. Si ves algo que no fuiste vos,
              cambiá tu contraseña y cerrá todas las sesiones.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Todavía no hay actividad registrada.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item, i) => (
              <li key={`${item.createdAt}-${i}`} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className={cn("text-xs font-semibold", ALERT.has(item.action) && "text-warn")}>
                    {activityLabel(item)}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.device}
                    {item.ip ? ` · ${item.ip}` : ""}
                  </p>
                </div>
                <time dateTime={item.createdAt} className="shrink-0 text-[11px] text-muted-foreground">
                  {fmt.format(new Date(item.createdAt))}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
