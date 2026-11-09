"use client";

import { MenuGroup, MenuRow } from "@/components/ui/menu-list";
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
    <MenuGroup title="Actividad reciente" footer="Si ves algo que no fuiste vos, cambiá tu contraseña y cerrá todas las sesiones.">
      {isLoading ? (
        <MenuRow>
          <Skeleton className="h-10 w-full" />
        </MenuRow>
      ) : items.length === 0 ? (
        <MenuRow className="text-ink-muted">Todavía no hay actividad registrada.</MenuRow>
      ) : (
        items.map((item, i) => (
          <MenuRow key={`${item.createdAt}-${i}`} className="items-start justify-between">
            <div className="min-w-0">
              <p className={cn("font-semibold", ALERT.has(item.action) && "text-warn")}>{activityLabel(item)}</p>
              <p className="truncate text-caption text-ink-muted">
                {item.device}
                {item.ip ? ` · ${item.ip}` : ""}
              </p>
            </div>
            <time dateTime={item.createdAt} className="shrink-0 text-caption text-ink-muted">
              {fmt.format(new Date(item.createdAt))}
            </time>
          </MenuRow>
        ))
      )}
    </MenuGroup>
  );
}
