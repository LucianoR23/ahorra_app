"use client";

import { useState } from "react";
import useSWRInfinite from "swr/infinite";
import Link from "next/link";
import { Bug, Lightbulb, Paperclip, MessageSquare, Plus, LifeBuoy } from "lucide-react";
import type { PagedTickets, TicketSummary } from "@/lib/api/schemas";
import { TICKET_OPEN_STATUSES } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SupportStatusBadge } from "./support-status-badge";

const PAGE_SIZE = 20;

// Cursor pagination con useSWRInfinite: la key de cada página lleva el
// next_cursor de la anterior. Devolver null corta (última página).
const getKey = (index: number, prev: PagedTickets | null) => {
  if (prev && !prev.next_cursor) return null;
  const cursor = index === 0 ? undefined : prev?.next_cursor;
  return [
    "/support/tickets/mine",
    { householdScoped: false, query: { cursor, limit: PAGE_SIZE } },
  ] as const;
};

export function SupportList() {
  const { data, size, setSize, isLoading, isValidating, error, mutate } =
    useSWRInfinite<PagedTickets>(getKey, { revalidateFirstPage: false });
  const [onlyOpen, setOnlyOpen] = useState(false);

  const items: TicketSummary[] = data ? data.flatMap((p) => p.items) : [];
  const hasMore = data ? Boolean(data[data.length - 1]?.next_cursor) : false;
  const loadingMore = isValidating && !isLoading;

  const visible = onlyOpen
    ? items.filter((t) => TICKET_OPEN_STATUSES.includes(t.status))
    : items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOnlyOpen((v) => !v)}
          aria-pressed={onlyOpen}
          className={cn(
            "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors",
            onlyOpen
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          Solo abiertos
        </button>
        <Button render={<Link href="/soporte/nuevo" />} nativeButton={false} size="sm">
          <Plus data-icon="inline-start" />
          Nuevo reporte
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : error && items.length === 0 ? (
        <EmptyState
          title="No pudimos cargar tus reportes"
          body="Revisá tu conexión e intentá de nuevo."
          action={
            <Button variant="outline" size="sm" onClick={() => void mutate()}>
              Reintentar
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={onlyOpen ? "No tenés reportes abiertos" : "Todavía no reportaste nada"}
          body={
            onlyOpen
              ? "Cuando un reporte esté en juego, lo vas a ver acá."
              : "¿Encontraste un error o tenés una idea? Contanos."
          }
          action={
            !onlyOpen ? (
              <Button render={<Link href="/soporte/nuevo" />} nativeButton={false} size="sm">
                <Plus data-icon="inline-start" />
                Crear reporte
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => (
            <li key={t.id}>
              <TicketRow ticket={t} />
            </li>
          ))}
        </ul>
      )}

      {hasMore && !onlyOpen && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => void setSize(size + 1)}
          >
            {loadingMore ? "Cargando…" : "Cargar más"}
          </Button>
        </div>
      )}
    </div>
  );
}

function TicketRow({ ticket }: { ticket: TicketSummary }) {
  const TypeIcon = ticket.type === "bug" ? Bug : Lightbulb;
  const title = ticket.subject?.trim() || ticket.description_preview;
  return (
    <Link
      href={`/soporte/${ticket.id}`}
      className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-card transition-colors hover:border-primary/30"
    >
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
        <TypeIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold">{title}</p>
          <SupportStatusBadge status={ticket.status} className="mt-0.5" />
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {ticket.description_preview}
        </p>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-ink-faint">
          <span>{new Date(ticket.created_at).toLocaleDateString("es-AR")}</span>
          {ticket.attachments_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3" />
              {ticket.attachments_count}
            </span>
          )}
          {ticket.public_messages_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3" />
              {ticket.public_messages_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground">
        <LifeBuoy className="size-5" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{body}</p>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
