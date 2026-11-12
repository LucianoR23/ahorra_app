"use client";

import { useEffect, useState } from "react";
import { mutate as swrMutate } from "swr";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCheck, Info, Search, Settings, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ListRow, ListRowSkeleton } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { useInsights, useInsightsUnreadCount } from "@/lib/api/hooks";
import { markAllInsightsRead } from "@/lib/api/mutations";
import type { Insight } from "@/lib/api/schemas";
import { dayLabel } from "@/lib/format";
import { relativeTime } from "@/lib/insights";
import { toast, toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useMaskText } from "@/stores/discreet";

const PAGE = 50;
const MAX_ROWS = 200;

const TYPES = [
  { value: "all", label: "Todas" },
  { value: "alert", label: "Alertas" },
  { value: "daily_summary", label: "Diarias" },
  { value: "weekly_review", label: "Semanales" },
  { value: "monthly_review", label: "Mensuales" },
  { value: "shared_expense", label: "Gastos compartidos" },
  { value: "invite", label: "Invitaciones" },
  { value: "settlement", label: "Pagos" },
] as const;

type TypeFilter = (typeof TYPES)[number]["value"];

export function invalidateInsights() {
  swrMutate((k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/insights"), undefined, { revalidate: true });
}

/** The round icon a notification leads with, by severity. */
export function InsightIcon({ severity, size = 40 }: { severity: Insight["severity"]; size?: number }) {
  const { Icon, tone } =
    severity === "critical"
      ? { Icon: AlertTriangle, tone: "bg-negative-soft text-negative" }
      : severity === "warning"
        ? { Icon: Info, tone: "bg-warn/12 text-warn" }
        : { Icon: Sparkles, tone: "bg-surface-2 text-ink" };
  return (
    <span aria-hidden style={{ width: size, height: size }} className={cn("grid shrink-0 place-items-center rounded-full", tone)}>
      <Icon style={{ width: size / 2, height: size / 2 }} strokeWidth={1.75} />
    </span>
  );
}

/** The day (America/Argentina/Buenos_Aires) a notification belongs to. */
function localDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

/**
 * Notificaciones (plan 1.10b, no design: the `Movimientos` list). Unread
 * count in the header, search behind the magnifier, filter chips, the
 * notifications grouped by day. Each opens its detail, which marks it read.
 */
export function InsightsInbox() {
  const mask = useMaskText();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [type, setType] = useState<TypeFilter>("all");
  const [rows, setRows] = useState(PAGE);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // A new search starts from the first page (render-time reset, no effect).
  const [prevQuery, setPrevQuery] = useState(debouncedQuery);
  if (debouncedQuery !== prevQuery) {
    setPrevQuery(debouncedQuery);
    setRows(PAGE);
  }

  const { data, isLoading, error } = useInsights({
    unread: onlyUnread || undefined,
    type: type === "all" ? undefined : type,
    q: debouncedQuery || undefined,
    limit: rows,
    offset: 0,
  });
  const { data: unreadData } = useInsightsUnreadCount();
  const unread = unreadData?.unread ?? 0;
  const items = data?.items ?? [];
  const count = data?.totalCount ?? 0;

  const groups: { day: string; items: Insight[] }[] = [];
  for (const i of items) {
    const day = localDay(i.createdAt || i.insightDate);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(i);
    else groups.push({ day, items: [i] });
  }

  async function handleMarkAll() {
    if (unread === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllInsightsRead();
      invalidateInsights();
      toast.success("Todas marcadas como leídas");
    } catch (e) {
      toastError(e, "No se pudo marcar todas");
    } finally {
      setMarkingAll(false);
    }
  }

  function closeSearch() {
    setSearching(false);
    setQuery("");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4">
      <PageHeader
        title="Notificaciones"
        description={<span aria-live="polite">{unread > 0 ? (unread === 1 ? "1 sin leer" : `${unread} sin leer`) : "Todo al día"}</span>}
        className="mb-0"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              aria-label={searching ? "Cerrar búsqueda" : "Buscar"}
              aria-expanded={searching}
              onClick={() => (searching ? closeSearch() : setSearching(true))}
            >
              {searching ? <X aria-hidden strokeWidth={1.75} /> : <Search aria-hidden strokeWidth={1.75} />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Marcar todas como leídas"
              onClick={handleMarkAll}
              disabled={markingAll || unread === 0}
            >
              <CheckCheck aria-hidden strokeWidth={1.75} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Preferencias de notificaciones"
              nativeButton={false}
              render={<Link href="/ajustes/notificaciones" />}
            >
              <Settings aria-hidden strokeWidth={1.75} />
            </Button>
          </div>
        }
      />

      {searching && (
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.75} />
          <Input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en notificaciones"
            aria-label="Buscar en notificaciones"
            className="pl-10"
          />
        </div>
      )}

      <div
        role="group"
        aria-label="Filtros"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <Chip
          pressed={onlyUnread}
          onClick={() => {
            setRows(PAGE);
            setOnlyUnread(!onlyUnread);
          }}
        >
          Sin leer
        </Chip>
        {TYPES.map((t) => (
          <Chip
            key={t.value}
            pressed={type === t.value}
            onClick={() => {
              setRows(PAGE);
              setType(t.value);
            }}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
          No pudimos cargar las notificaciones. Probá de nuevo en un rato.
        </p>
      )}

      {isLoading ? (
        <Card className="py-1">
          <CardContent>
            {[0, 1, 2].map((i) => (
              <ListRowSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={debouncedQuery ? Search : Bell}
          title={debouncedQuery ? "Sin resultados" : onlyUnread ? "Nada sin leer" : "No tenés notificaciones"}
          description={
            debouncedQuery
              ? "Ninguna notificación coincide. Probá con otras palabras."
              : onlyUnread
                ? "Ya estás al día."
                : "Acá te avisamos de cierres de tarjeta, objetivos y movimientos del hogar."
          }
        />
      ) : (
        groups.map((g) => (
          <section key={g.day} aria-label={dayLabel(g.day)} className="flex flex-col gap-2">
            <h2 className="px-1 text-body font-semibold text-ink-muted">{dayLabel(g.day)}</h2>
            <Card className="py-1">
              <CardContent>
                <ul className="divide-y divide-border">
                  {g.items.map((n) => (
                    <li key={n.id}>
                      <ListRow
                        href={`/notificaciones/${n.id}`}
                        leading={<InsightIcon severity={n.severity} />}
                        title={
                          <span className={cn(n.isRead && "font-normal")}>
                            {!n.isRead && <span className="sr-only">Sin leer: </span>}
                            {mask(n.title)}
                          </span>
                        }
                        subtitle={mask(n.body)}
                        trailing={
                          <span className="flex flex-col items-end gap-1.5 text-caption font-normal text-ink-muted">
                            {relativeTime(n.createdAt || n.insightDate)}
                            {!n.isRead && <span aria-hidden data-slot="unread-dot" className="size-2.5 rounded-full bg-brand" />}
                          </span>
                        }
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        ))
      )}

      {items.length < count &&
        (rows < MAX_ROWS ? (
          <Button variant="secondary" className="self-center" onClick={() => setRows(Math.min(rows + PAGE, MAX_ROWS))}>
            Cargar más
          </Button>
        ) : (
          <p className="text-center text-caption text-ink-muted">
            Ves las últimas {MAX_ROWS} de {count}.
          </p>
        ))}
    </div>
  );
}

// Named badge for navs, exported here to avoid a circular import.
export function InsightsUnreadBadge({ className, dotOnly = false }: { className?: string; dotOnly?: boolean }) {
  const { data } = useInsightsUnreadCount();
  const count = data?.unread ?? 0;
  if (!count) return null;
  if (dotOnly) {
    return (
      <span
        aria-label={`${count} notificaciones sin leer`}
        className={cn("block size-2 rounded-full bg-negative ring-2 ring-background", className)}
      />
    );
  }
  return (
    <span
      aria-label={`${count} notificaciones sin leer`}
      className={cn("grid h-4 min-w-4 place-items-center rounded-full bg-negative px-1 text-xs leading-none font-bold text-white", className)}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
