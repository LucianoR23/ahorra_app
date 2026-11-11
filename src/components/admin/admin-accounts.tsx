"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWRInfinite from "swr/infinite";
import { ChevronRight, Loader2, Search } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MenuGroup, MenuRow } from "@/components/ui/menu-list";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminUser } from "@/lib/api/hooks";

type Page = { items: AdminUser[] | null; nextOffset: number | null };

export const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });

export function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`.trim();
}

/** The account's state as small badges. */
export function AccountBadges({ u }: { u: AdminUser }) {
  return (
    <>
      {u.isSuperadmin && <Badge variant="default">Superadmin</Badge>}
      {u.deletedAt ? (
        <Badge variant="destructive">Borrada</Badge>
      ) : !u.verifiedAt ? (
        <Badge variant="secondary">Sin verificar</Badge>
      ) : null}
    </>
  );
}

/**
 * Accounts (plan 1.11): search by email or name, newest first. Each opens
 * its metadata and activity; nothing financial.
 */
export function AdminAccounts() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);

  const getKey = (index: number, prev: Page | null) => {
    if (prev && prev.nextOffset == null) return null;
    const offset = index === 0 ? undefined : (prev?.nextOffset ?? undefined);
    return ["/admin/users", { householdScoped: false, query: { q: q || undefined, offset } }] as const;
  };
  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite<Page>(getKey, {
    revalidateFirstPage: false,
  });
  const items = data ? data.flatMap((p) => p.items ?? []) : [];
  const hasMore = data ? data[data.length - 1]?.nextOffset != null : false;
  const loadingMore = isValidating && !isLoading && size > 1;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader title="Cuentas" description="Datos de cuenta y actividad. Nada de su plata." className="mb-0" />
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
        <Input
          type="search"
          aria-label="Buscar por email o nombre"
          placeholder="Buscar por email o nombre"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={100}
          className="pl-9"
        />
      </div>
      <MenuGroup>
        {error ? (
          <MenuRow>
            <Alert variant="error" className="w-full">
              No se pudo cargar la lista.
            </Alert>
          </MenuRow>
        ) : isLoading ? (
          <MenuRow>
            <Skeleton className="h-10 w-full" />
          </MenuRow>
        ) : items.length === 0 ? (
          <MenuRow className="text-ink-muted">{q ? "Ninguna cuenta coincide." : "Todavía no hay cuentas."}</MenuRow>
        ) : (
          items.map((u) => (
            <li key={u.id}>
              <Link
                href={`/admin/cuentas/${u.id}`}
                className="flex min-h-14 items-center gap-3 py-3 text-body text-ink outline-none transition-opacity active:opacity-60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold">{fullName(u) || u.email}</span>
                    <AccountBadges u={u} />
                  </span>
                  <span className="block truncate text-caption text-ink-muted">{u.email}</span>
                </span>
                <span className="shrink-0 text-right text-caption text-ink-muted">
                  Alta {fmtDay(u.createdAt)}
                  <span className="block">
                    {u.households === 1 ? "1 hogar" : u.households > 1 ? `${u.households} hogares` : "Sin hogar"}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-muted" strokeWidth={1.75} />
              </Link>
            </li>
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
