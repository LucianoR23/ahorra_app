"use client";

import { useState } from "react";
import Link from "next/link";
import useSWRInfinite from "swr/infinite";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { MenuGroup, MenuRow } from "@/components/ui/menu-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminAuditEvent, AdminAuditGroup } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

/** Spanish labels for the audit actions, in third person (plan 0.17). */
const LABELS: Record<string, string> = {
  "login.success": "Inicio de sesión",
  "login.failed": "Intento de inicio de sesión fallido",
  "login.new_device": "Inicio de sesión desde un dispositivo nuevo",
  logout: "Cerró sesión",
  "logout.all": "Cerró sesión en todos los dispositivos",
  "password.changed": "Cambió la contraseña",
  "password.reset": "Restableció la contraseña",
  "email.change_requested": "Pidió cambiar el email",
  "email.changed": "Cambió el email",
  "account.deleted": "Borró la cuenta",
  "household.joined": "Se unió a un hogar",
  "household.member_removed": "Salió de un hogar o lo quitaron",
  "household.role_changed": "Cambió el dueño de un hogar",
  "admin.household_restored": "Superadmin restauró un hogar",
  "admin.household_purged": "Superadmin eliminó un hogar",
  "admin.waitlist_exported": "Superadmin exportó la lista de espera",
  "admin.waitlist_deleted": "Superadmin borró un email de la lista de espera",
};

const ALERT = new Set(["login.failed", "login.new_device", "account.deleted", "admin.household_purged"]);

const GROUPS: { id: AdminAuditGroup; label: string }[] = [
  { id: "", label: "Todo" },
  { id: "sessions", label: "Sesiones" },
  { id: "failed", label: "Fallidos" },
  { id: "account", label: "Cuenta" },
  { id: "household", label: "Hogares" },
  { id: "admin", label: "Superadmin" },
];

const fmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function auditLabel(action: string): string {
  return LABELS[action] ?? action;
}

type Page = { items: AdminAuditEvent[] | null; nextCursor: string | null };

/** Who an event happened to and, when someone else did it, who. */
function Who({ e, linkAccounts }: { e: AdminAuditEvent; linkAccounts: boolean }) {
  const account = (id: string | null, email: string | null) =>
    !email ? (
      <span>cuenta borrada</span>
    ) : linkAccounts && id ? (
      <Link href={`/admin/cuentas/${id}`} className="underline-offset-2 hover:underline">
        {email}
      </Link>
    ) : (
      <span>{email}</span>
    );
  const byOther = e.actorId && e.actorId !== e.userId;
  return (
    <>
      {e.userId || !byOther ? account(e.userId, e.userEmail) : null}
      {byOther ? (
        <>
          {e.userId ? " · por " : "Por "}
          {account(e.actorId, e.actorEmail)}
        </>
      ) : null}
    </>
  );
}

/**
 * The audit log of every account (plan 1.11), newest first, 50 at a time.
 * With `userId` it shows one account's events: what happened to it and what
 * it did.
 */
export function AdminAudit({ userId, title }: { userId?: string; title?: string }) {
  const [group, setGroup] = useState<AdminAuditGroup>("");
  const getKey = (index: number, prev: Page | null) => {
    if (prev && !prev.nextCursor) return null;
    const cursor = index === 0 ? undefined : (prev?.nextCursor ?? undefined);
    return ["/admin/audit", { householdScoped: false, query: { group: group || undefined, userId, cursor } }] as const;
  };
  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite<Page>(getKey, {
    revalidateFirstPage: false,
  });
  const items = data ? data.flatMap((p) => p.items ?? []) : [];
  const hasMore = data ? Boolean(data[data.length - 1]?.nextCursor) : false;
  const loadingMore = isValidating && !isLoading && size > 1;

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Filtrar eventos" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        {GROUPS.map((g) => (
          <Chip key={g.id} pressed={group === g.id} onClick={() => setGroup(g.id)}>
            {g.label}
          </Chip>
        ))}
      </div>
      <MenuGroup title={title} footer="Las IP se guardan 7 días y los eventos, 12 meses.">
        {error ? (
          <MenuRow>
            <Alert variant="error" className="w-full">
              No se pudo cargar la actividad.
            </Alert>
          </MenuRow>
        ) : isLoading ? (
          <MenuRow>
            <Skeleton className="h-10 w-full" />
          </MenuRow>
        ) : items.length === 0 ? (
          <MenuRow className="text-ink-muted">No hay eventos.</MenuRow>
        ) : (
          items.map((e) => (
            <MenuRow key={e.id} className="items-start justify-between">
              <div className="min-w-0">
                <p className={cn("font-semibold", ALERT.has(e.action) && "text-warn")}>{auditLabel(e.action)}</p>
                <p className="text-caption text-ink-muted [overflow-wrap:anywhere]">
                  <Who e={e} linkAccounts={!userId} />
                </p>
                {e.device || e.ip ? (
                  <p className="truncate text-caption text-ink-muted">
                    {e.device}
                    {e.ip ? `${e.device ? " · " : ""}${e.ip}` : ""}
                  </p>
                ) : null}
              </div>
              <time dateTime={e.createdAt} className="shrink-0 text-caption text-ink-muted tabular-nums">
                {fmt.format(new Date(e.createdAt))}
              </time>
            </MenuRow>
          ))
        )}
      </MenuGroup>
      {hasMore ? (
        <Button variant="outline" onClick={() => setSize(size + 1)} disabled={loadingMore}>
          {loadingMore && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Ver más
        </Button>
      ) : null}
    </div>
  );
}
