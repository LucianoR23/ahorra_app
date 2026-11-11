"use client";

import { House, Wallet } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { MenuGroup, MenuRow } from "@/components/ui/menu-list";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUser } from "@/lib/api/hooks";
import { AccountBadges, fmtDay, fullName } from "./admin-accounts";
import { AdminAudit } from "./admin-audit";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <MenuRow className="justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="min-w-0 text-right [overflow-wrap:anywhere]">{children}</span>
    </MenuRow>
  );
}

const ROLES: Record<string, string> = { owner: "Dueño", member: "Miembro" };

/**
 * One account (plan 1.11): metadata, its spaces by name and size, and its
 * activity. Plan §8b: nothing from inside the spaces.
 */
export function AdminAccountDetail({ id }: { id: string }) {
  const { data: u, error, isLoading } = useAdminUser(id);
  const back = { href: "/admin/cuentas", label: "Volver a Cuentas" };

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <PageHeader title="Cuenta" back={back} className="mb-0" />
        <Alert variant="error">No se encontró la cuenta.</Alert>
      </div>
    );
  }
  if (isLoading || !u) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <PageHeader title="Cuenta" back={back} className="mb-0" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const providers = u.providers ?? [];
  const signIn = [u.hasPassword && "Contraseña", providers.includes("google") && "Google"].filter(Boolean).join(" y ");
  const spaces = u.spaces ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title={fullName(u) || u.email}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            {u.email}
            <AccountBadges u={u} />
          </span>
        }
        back={back}
        className="mb-0"
      />
      <MenuGroup title="Cuenta">
        <Row label="Alta">{fmtDay(u.createdAt)}</Row>
        <Row label="Email verificado">{u.verifiedAt ? fmtDay(u.verifiedAt) : "No"}</Row>
        {u.pendingEmail ? <Row label="Cambio de email pendiente">{u.pendingEmail}</Row> : null}
        <Row label="Ingresa con">{signIn || "Sin método"}</Row>
        <Row label="Última vez activa">{u.lastSeenAt ? fmtDay(u.lastSeenAt) : "Nunca"}</Row>
        <Row label="Sesiones abiertas">{u.activeSessions}</Row>
        {u.deletedAt ? <Row label="Borrada">{fmtDay(u.deletedAt)}</Row> : null}
      </MenuGroup>
      <MenuGroup title="Espacios" footer="Solo nombre y tamaño. Lo que hay adentro no se ve desde acá.">
        {spaces.length === 0 ? (
          <MenuRow className="text-ink-muted">Sin espacios.</MenuRow>
        ) : (
          spaces.map((s) => {
            const Icon = s.kind === "personal" ? Wallet : House;
            return (
              <MenuRow key={s.id}>
                <Icon aria-hidden className="size-5 shrink-0 text-ink-muted" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{s.kind === "personal" ? "Mi plata" : s.name}</span>
                  <span className="block text-caption text-ink-muted">
                    {s.kind === "personal"
                      ? "Personal"
                      : `${ROLES[s.role] ?? s.role} · ${s.members === 1 ? "1 miembro" : `${s.members} miembros`}`}
                    {s.deletedAt ? ` · borrado el ${fmtDay(s.deletedAt)}` : ""}
                  </span>
                </span>
              </MenuRow>
            );
          })
        )}
      </MenuGroup>
      <AdminAudit userId={u.id} title="Actividad" />
    </div>
  );
}
