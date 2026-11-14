"use client";

import Link from "next/link";
import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Copy, Mail, MailQuestion } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { INBOUND_MESSAGES_KEY, useInboundAddress, useInboundMessages, type InboundMessage } from "@/lib/api/hooks";
import { acceptInboundSender, dismissInboundMessage } from "@/lib/api/mutations";
import { fmtDateShort } from "@/lib/format";
import { toast, toastError } from "@/lib/toast";

/**
 * Gmail search for the notifications the rules read (plan 3.5): the filter
 * forwards only these, not the whole inbox.
 */
export const GMAIL_FILTER =
  "from:(mercadopago.com OR bancogalicia.com.ar OR santander.com.ar OR bbva.com.ar OR naranjax.com OR brubank.com)";

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copiado`);
  } catch (err) {
    toastError(err, "No pudimos copiarlo: seleccionalo y copialo a mano.");
  }
}

/** Where Cargar gasto opens a mail (plan 3.5). */
export function mailHref(id: string) {
  return `/agregar?mail=${encodeURIComponent(id)}`;
}

/**
 * Gastos por mail (plan 3.5): the person's forwarding address, how to set
 * up Gmail, Gmail's confirmation code and the mails waiting to be loaded.
 * Loading one opens Cargar gasto with its sentence (decided with the user).
 */
export function InboundEmail() {
  const address = useInboundAddress();
  const messages = useInboundMessages({ poll: true });

  if (address.error) {
    return (
      <Alert>
        Cargar gastos reenviando mails todavía no está disponible. Mientras tanto, podés compartir la captura a la
        app o sacarle una foto desde Cargar gasto.
      </Alert>
    );
  }

  const list = messages.data ?? [];
  const code = list.find((m) => m.kind === "gmail_confirmation" && m.gmailCode);
  const open = list.filter((m) => m.kind === "expense");

  return (
    <div className="flex flex-col gap-4">
      <PendingMails messages={open} loading={messages.isLoading} />

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-body font-bold text-ink">Tu dirección</h2>
          <p className="text-caption text-ink-muted">
            Los mails que lleguen acá desde tu casilla se leen solos y te esperan arriba para que los revises.
          </p>
          {address.data ? (
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-caption text-ink" data-testid="inbound-address">
                {address.data.address}
              </code>
              <Button type="button" variant="secondary" size="sm" onClick={() => void copy(address.data!.address, "Dirección")}>
                <Copy className="size-4" />
                Copiar
              </Button>
            </div>
          ) : (
            <Skeleton className="h-9 w-full" />
          )}
        </CardContent>
      </Card>

      {code?.gmailCode ? (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <h2 className="text-body font-bold text-ink">Código de Gmail</h2>
            <p className="text-caption text-ink-muted">Pegalo en Gmail para confirmar el reenvío.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-title font-bold tracking-widest text-ink">
                {code.gmailCode}
              </code>
              <Button type="button" variant="secondary" size="sm" onClick={() => void copy(code.gmailCode!, "Código")}>
                <Copy className="size-4" />
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-body font-bold text-ink">Cómo configurarlo en Gmail</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-caption text-ink">
            <li>Copiá tu dirección.</li>
            <li>
              En Gmail desde la compu: Configuración › Ver toda la configuración › Reenvío y correo POP/IMAP › Agregar
              una dirección de reenvío. Pegá tu dirección.
            </li>
            <li>Gmail manda un código a esa dirección: aparece en esta pantalla en unos segundos. Pegalo en Gmail.</li>
            <li>
              Creá un filtro: en la búsqueda de Gmail pegá el texto de abajo, tocá «Crear filtro», marcá «Reenviar a» y
              elegí tu dirección.
            </li>
          </ol>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-caption text-ink">{GMAIL_FILTER}</code>
            <Button type="button" variant="secondary" size="sm" onClick={() => void copy(GMAIL_FILTER, "Filtro")}>
              <Copy className="size-4" />
              Copiar
            </Button>
          </div>
          <p className="text-caption text-ink-muted">
            Leemos los avisos de Mercado Pago, Galicia, Santander, BBVA, Naranja X y Brubank. Si reenviás otros, los
            leemos con IA. Nunca guardamos el mail: solo lo que dice del gasto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function refresh() {
  void swrMutate(INBOUND_MESSAGES_KEY);
}

function PendingMails({ messages, loading }: { messages: InboundMessage[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-20 w-full" />;
  if (messages.length === 0) return null;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-body font-bold text-ink">Para revisar</h2>
        <ul className="flex flex-col gap-3">
          {messages.map((m) => (
            <li key={m.id}>{m.status === "sender_pending" ? <SenderQuestion m={m} /> : <PendingMail m={m} />}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function useAct() {
  const [busy, setBusy] = useState(false);
  async function act(fn: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      refresh();
    } catch (err) {
      toastError(err, "No pudimos hacerlo. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, act };
}

function PendingMail({ m }: { m: InboundMessage }) {
  const { busy, act } = useAct();
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
        <Mail className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-ink">{m.sentence ?? "Mail sin leer"}</p>
        <p className="text-caption text-ink-muted">Llegó el {fmtDateShort(m.receivedAt.slice(0, 10))}</p>
        <div className="mt-2 flex gap-2">
          {m.sentence ? (
            <Button size="sm" nativeButton={false} render={<Link href={mailHref(m.id)} />}>
              Cargar
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void act(() => dismissInboundMessage(m.id), "Mail descartado")}
          >
            Descartar
          </Button>
        </div>
      </div>
    </div>
  );
}

function SenderQuestion({ m }: { m: InboundMessage }) {
  const { busy, act } = useAct();
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
        <MailQuestion className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-ink">Llegó un mail reenviado desde {m.sender}. ¿Es tuyo?</p>
        <p className="text-caption text-ink-muted">
          Si es tuyo, los próximos que reenvíes desde ahí se leen solos.
        </p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => void act(() => acceptInboundSender(m.id), "Listo, es tuyo")}>
            Sí, es mío
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void act(() => dismissInboundMessage(m.id), "Mail descartado")}
          >
            No
          </Button>
        </div>
      </div>
    </div>
  );
}
