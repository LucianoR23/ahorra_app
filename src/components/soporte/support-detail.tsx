"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Bug, Lightbulb, ArrowLeft, Loader2, Send, ImageOff } from "lucide-react";
import { addTicketMessage } from "@/lib/api/support";
import type { Ticket, Attachment, TicketMessage } from "@/lib/api/schemas";
import { TICKET_TYPE_LABELS } from "@/lib/labels";
import { ApiError } from "@/lib/api/errors";
import { toastError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SupportStatusBadge } from "./support-status-badge";

const MESSAGE_MAX = 4000;
const POLL_MS = 3000;

export function SupportDetail({ id }: { id: string }) {
  // Polling solo mientras haya adjuntos procesándose (thumbnails/validación).
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
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <p className="text-sm font-semibold">
            {notFound ? "No encontramos este reporte" : "No pudimos cargar el reporte"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {notFound ? "Puede que no exista o no sea tuyo." : "Revisá tu conexión e intentá de nuevo."}
          </p>
          {!notFound && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void mutate()}>
              Reintentar
            </Button>
          )}
        </div>
      </div>
    );
  }

  const TypeIcon = ticket.type === "bug" ? Bug : Lightbulb;
  const messages = ticket.messages ?? [];

  return (
    <div className="space-y-5">
      <BackLink />

      {/* Encabezado */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <TypeIcon className="size-3" />
            {TICKET_TYPE_LABELS[ticket.type]}
          </span>
          <SupportStatusBadge status={ticket.status} />
        </div>
        {ticket.subject && (
          <h2 className="mt-2 text-lg font-bold tracking-tight">{ticket.subject}</h2>
        )}
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{ticket.description}</p>
        <p className="mt-2 text-[11px] text-ink-faint">
          Creado el {new Date(ticket.created_at).toLocaleString("es-AR")}
        </p>
      </div>

      {/* Adjuntos */}
      {ticket.attachments.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground">Adjuntos</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ticket.attachments.map((a) => (
              <AttachmentTile key={a.id} attachment={a} />
            ))}
          </div>
        </section>
      )}

      {/* Hilo */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground">Conversación</h3>
        {messages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-6 text-center text-xs text-muted-foreground">
            Todavía no hay respuestas. Te avisamos acá cuando el equipo responda.
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li key={m.id}>
                <MessageBubble message={m} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Responder */}
      <form onSubmit={onSend} className="space-y-2">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={MESSAGE_MAX}
          placeholder="Escribí un mensaje…"
          className="min-h-20"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-faint">
            {reply.length}/{MESSAGE_MAX}
          </span>
          <Button type="submit" size="sm" disabled={sending || !reply.trim()}>
            {sending ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Send data-icon="inline-start" />
                Enviar
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AttachmentTile({ attachment: a }: { attachment: Attachment }) {
  if (a.processing_status === "pending") {
    return (
      <div className="grid aspect-square place-items-center rounded-xl border border-border bg-secondary">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (a.processing_status === "failed") {
    return (
      <div className="grid aspect-square place-items-center gap-1 rounded-xl border border-border bg-secondary text-muted-foreground">
        <ImageOff className="size-5" />
        <span className="text-[10px]">No disponible</span>
      </div>
    );
  }
  // ready
  if (a.kind === "video") {
    return (
      <video
        src={a.url}
        controls
        className="aspect-square w-full rounded-xl border border-border bg-black object-cover"
      />
    );
  }
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-xl border border-border bg-secondary"
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
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
          isAdmin
            ? "rounded-tl-sm bg-secondary text-foreground"
            : "rounded-tr-sm bg-primary text-primary-foreground",
        )}
      >
        <div
          className={cn(
            "mb-0.5 text-[10px] font-medium",
            isAdmin ? "text-muted-foreground" : "text-primary-foreground/70",
          )}
        >
          {isAdmin ? "Soporte" : "Vos"} · {new Date(m.created_at).toLocaleString("es-AR")}
        </div>
        <p className="whitespace-pre-wrap">{m.body}</p>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/soporte"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      Mis reportes
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
