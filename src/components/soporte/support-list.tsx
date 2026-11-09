"use client";

import { useState } from "react";
import useSWRInfinite from "swr/infinite";
import Link from "next/link";
import { Bug, LifeBuoy, Lightbulb, MessageSquare, Paperclip, Plus } from "lucide-react";
import type { PagedTickets, TicketSummary } from "@/lib/api/schemas";
import { TICKET_OPEN_STATUSES } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow, ListRowSkeleton } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { SupportStatusBadge } from "./support-status-badge";

const PAGE_SIZE = 20;

// Cursor pagination: each page's key carries the previous page's cursor;
// null stops it (last page).
const getKey = (index: number, prev: PagedTickets | null) => {
  if (prev && !prev.next_cursor) return null;
  const cursor = index === 0 ? undefined : prev?.next_cursor;
  return ["/support/tickets/mine", { householdScoped: false, query: { cursor, limit: PAGE_SIZE } }] as const;
};

/** The round icon of a report: a bug or an idea. */
export function TicketIcon({ type, size = 40 }: { type: TicketSummary["type"]; size?: number }) {
  const Icon = type === "bug" ? Bug : Lightbulb;
  return (
    <span aria-hidden style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
      <Icon style={{ width: size / 2, height: size / 2 }} strokeWidth={1.75} />
    </span>
  );
}

/**
 * Soporte (plan 1.10b, no design: the `Movimientos` list). Your reports
 * with their status; "Solo abiertos" filters the ones still in play.
 */
export function SupportList({ help }: { help?: React.ReactNode }) {
  const { data, size, setSize, isLoading, isValidating, error, mutate } = useSWRInfinite<PagedTickets>(getKey, {
    revalidateFirstPage: false,
  });
  const [onlyOpen, setOnlyOpen] = useState(false);

  // Go sends an empty page as null items (the SWR fetcher does not apply zod defaults).
  const items: TicketSummary[] = data ? data.flatMap((p) => p.items ?? []) : [];
  const hasMore = data ? Boolean(data[data.length - 1]?.next_cursor) : false;
  const loadingMore = isValidating && !isLoading;
  const visible = onlyOpen ? items.filter((t) => TICKET_OPEN_STATUSES.includes(t.status)) : items;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4">
      <PageHeader
        title="Soporte"
        description="Reportá un error o sugerí una mejora, y seguí cómo va."
        className="mb-0"
        action={
          <div className="flex items-center gap-2">
            {help}
            <Button size="icon" aria-label="Nuevo reporte" nativeButton={false} render={<Link href="/soporte/nuevo" />}>
              <Plus aria-hidden strokeWidth={2} />
            </Button>
          </div>
        }
      />

      {items.length > 0 && (
        <div className="flex gap-2">
          <Chip pressed={onlyOpen} onClick={() => setOnlyOpen(!onlyOpen)}>
            Solo abiertos
          </Chip>
        </div>
      )}

      {isLoading ? (
        <Card className="py-1">
          <CardContent>
            {[0, 1, 2].map((i) => (
              <ListRowSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      ) : error && items.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="No pudimos cargar tus reportes"
          description="Revisá tu conexión y probá de nuevo."
          action={
            <Button variant="outline" onClick={() => void mutate()}>
              Reintentar
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={onlyOpen ? "No tenés reportes abiertos" : "Todavía no reportaste nada"}
          description={onlyOpen ? "Los que sigan en curso aparecen acá." : "¿Encontraste un error o tenés una idea? Contanos."}
          action={
            onlyOpen ? undefined : (
              <Button variant="outline" nativeButton={false} render={<Link href="/soporte/nuevo" />}>
                Crear reporte
              </Button>
            )
          }
        />
      ) : (
        <Card className="py-1">
          <CardContent>
            <ul className="divide-y divide-border">
              {visible.map((t) => (
                <li key={t.id}>
                  <ListRow
                    href={`/soporte/${t.id}`}
                    leading={<TicketIcon type={t.type} />}
                    title={t.subject?.trim() || t.description_preview}
                    subtitle={
                      <span className="inline-flex items-center gap-3">
                        <span>{new Date(t.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })}</span>
                        {t.attachments_count > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Paperclip aria-label="Adjuntos" className="size-3.5" strokeWidth={1.75} />
                            {t.attachments_count}
                          </span>
                        )}
                        {t.public_messages_count > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare aria-label="Respuestas" className="size-3.5" strokeWidth={1.75} />
                            {t.public_messages_count}
                          </span>
                        )}
                      </span>
                    }
                    trailing={<SupportStatusBadge status={t.status} />}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {hasMore && !onlyOpen && (
        <Button variant="secondary" className="self-center" disabled={loadingMore} onClick={() => void setSize(size + 1)}>
          {loadingMore ? "Cargando…" : "Cargar más"}
        </Button>
      )}
    </div>
  );
}
