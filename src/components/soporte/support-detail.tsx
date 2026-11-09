"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ChevronLeft, ImageOff, Loader2 } from "lucide-react";
import { addTicketMessage } from "@/lib/api/support";
import type { Ticket, Attachment, TicketMessage } from "@/lib/api/schemas";
import { TICKET_TYPE_LABELS } from "@/lib/labels";
import { ApiError } from "@/lib/api/errors";
import { toastError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { TicketIcon } from "./support-list";
import { SupportStatusBadge } from "./support-status-badge";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const MESSAGE_MAX = 4000;
const POLL_MS = 3000;

const SOPORTE_DETALLE_HELP: InfoHelpContent = {
  titulo: "Detalle del reporte",
  acciones: [
    "Seguí el estado del reporte y leé las respuestas del equipo.",
    "Mirá los adjuntos que enviaste (imágenes y videos).",
    "Respondé en la conversación para sumar información o seguir el hilo.",
  ],
  consideraciones: [
    "Los adjuntos pueden tardar unos segundos en procesarse; la vista se actualiza sola.",
    "El reporte es personal: solo vos y el equipo de soporte pueden verlo.",
  ],
  relacionado: [
    { label: "Mis reportes", href: "/soporte" },
    { label: "Nuevo reporte", href: "/soporte/nuevo" },
  ],
};

export function SupportDetail({ id }: { id: string }) {
  // Polls only while an attachment is still being processed.
  const { data: ticket, error, isLoading, mutate } = useSWR<Ticket>(
    [`/support/tickets/${id}`, { householdScoped: false }] as const,
    {
      refreshInterval: (data) =>
        data?.attachments?.some((a) => a.processing_status === "pending") ? POLL_MS : 0,
      shouldRetryOnError: false,
    },
  );
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const notFound = error instanceof ApiError && error.code === "not_found";

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const body = reply.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await addTicketMessage(id, body);
      setReply("");
      await mutate();
    } catch (err) {
      toastError(err, "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  if (isLoading && !ticket) return <DetailSkeleton />;

  if (!ticket) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <PageHeader title="Reporte" back={{ href: "/soporte", label: "Volver a Soporte" }} className="mb-0" />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 text-center">
            <p className="text-body font-semibold">{notFound ? "No encontramos este reporte" : "No pudimos cargar el reporte"}</p>
            <p className="text-caption text-ink-muted">
              {notFound ? "Puede que no exista o que no sea tuyo." : "Revisá tu conexión y probá de nuevo."}
            </p>
            {!notFound && (
              <Button variant="outline" onClick={() => void mutate()}>
                Reintentar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const messages = ticket.messages ?? [];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-4">
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="icon" aria-label="Volver a Soporte" nativeButton={false} render={<Link href="/soporte" />}>
          <ChevronLeft aria-hidden strokeWidth={1.75} />
        </Button>
        <InfoHelp content={SOPORTE_DETALLE_HELP} size="icon" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <TicketIcon type={ticket.type} size={64} />
        <p className="text-caption font-semibold text-ink-muted">{TICKET_TYPE_LABELS[ticket.type]}</p>
        {ticket.subject && <h1 className="text-title font-bold text-ink">{ticket.subject}</h1>}
        <SupportStatusBadge status={ticket.status} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <p className="text-body whitespace-pre-wrap text-ink">{ticket.description}</p>
          <p className="text-caption text-ink-muted">Lo enviaste el {fmtDateTime(ticket.created_at)}</p>
        </CardContent>
      </Card>

      {(ticket.attachments ?? []).length > 0 && (
        <section aria-label="Adjuntos" className="flex flex-col gap-2">
          <h2 className="px-1 text-caption font-semibold text-ink-muted">Adjuntos</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(ticket.attachments ?? []).map((a) => (
              <AttachmentTile key={a.id} attachment={a} />
            ))}
          </div>
        </section>
      )}

      <section aria-label="Conversación" className="flex flex-col gap-2">
        <h2 className="px-1 text-caption font-semibold text-ink-muted">Conversación</h2>
        {messages.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-caption text-ink-muted">
            Todavía no hay respuestas. Te avisamos cuando el equipo conteste.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <li key={m.id}>
                <MessageBubble message={m} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={onSend} className="flex flex-col gap-2">
        <Label htmlFor="ticket-reply" className="sr-only">
          Tu mensaje
        </Label>
        <Textarea
          id="ticket-reply"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={MESSAGE_MAX}
          placeholder="Escribí un mensaje…"
          className="min-h-20"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption text-ink-muted">
            {reply.length}/{MESSAGE_MAX}
          </span>
          <Button type="submit" disabled={sending || !reply.trim()}>
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** "9/11, 13:57" */
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function AttachmentTile({ attachment: a }: { attachment: Attachment }) {
  if (a.processing_status === "pending") {
    return (
      <div className="grid aspect-square place-items-center rounded-xl bg-surface-2">
        <Loader2 className="size-5 animate-spin text-ink-muted" />
      </div>
    );
  }
  if (a.processing_status === "failed") {
    return (
      <div className="grid aspect-square place-items-center gap-1 rounded-xl bg-surface-2 text-ink-muted">
        <ImageOff className="size-5" />
        <span className="text-xs">No disponible</span>
      </div>
    );
  }
  // ready
  if (a.kind === "video") {
    return (
      <video
        src={a.url}
        controls
        className="aspect-square w-full rounded-xl bg-surface-2 object-cover"
      />
    );
  }
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-xl bg-surface-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={a.thumbnail_url ?? a.url}
        alt="Adjunto del reporte"
        className="aspect-square w-full object-cover transition-opacity hover:opacity-90"
      />
    </a>
  );
}

function MessageBubble({ message: m }: { message: TicketMessage }) {
  const isAdmin = m.author_type === "admin";
  return (
    <div className={cn("flex", isAdmin ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-body",
          isAdmin
            ? "rounded-tl-sm bg-surface-2 text-ink"
            : "rounded-tr-sm bg-primary text-primary-foreground",
        )}
      >
        <div
          className={cn(
            "mb-0.5 text-caption font-semibold",
            isAdmin ? "text-ink-muted" : "text-primary-foreground/70",
          )}
        >
          {isAdmin ? "Soporte" : "Vos"} · {fmtDateTime(m.created_at)}
        </div>
        <p className="whitespace-pre-wrap">{m.body}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3">
      <Skeleton className="size-16 rounded-full" />
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
