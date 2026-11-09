"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InsightIcon, invalidateInsights } from "@/components/insights-inbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsight } from "@/lib/api/hooks";
import { deleteInsight, markInsightRead } from "@/lib/api/mutations";
import { confirm } from "@/lib/confirm";
import { insightLink, insightTypeLabel } from "@/lib/insights";
import { toastError } from "@/lib/toast";
import { useMaskText } from "@/stores/discreet";

/** "12 de marzo, 10:00" */
function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

/**
 * A notification (plan 1.10b, no design: the `Detalle` pattern). Opening it
 * marks it read; its link (the statement, Tarjetas, Objetivos...) is the
 * one action, delete sits at the end.
 */
export function InsightDetail({ id }: { id: string }) {
  const mask = useMaskText();
  const router = useRouter();
  const { data, isLoading, error } = useInsight(id);
  const [deleting, setDeleting] = useState(false);

  // Opening it marks it read (an API call, so an effect, not render).
  const unreadId = data && !data.isRead ? data.id : null;
  useEffect(() => {
    if (unreadId) markInsightRead(unreadId).then(invalidateInsights, () => {});
  }, [unreadId]);

  async function handleDelete() {
    if (!data) return;
    const ok = await confirm({
      title: "¿Eliminar esta notificación?",
      description: "No se puede deshacer.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteInsight(data.id);
      invalidateInsights();
      router.replace("/notificaciones");
    } catch (e) {
      toastError(e, "No se pudo eliminar");
      setDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <PageHeader title="Notificación" back={{ href: "/notificaciones", label: "Volver a Notificaciones" }} />
        <Card>
          <CardContent className="text-center text-body text-ink-muted">No se pudo cargar la notificación.</CardContent>
        </Card>
      </div>
    );
  }

  const link = insightLink(data);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-4">
      <div className="flex items-center">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Volver a Notificaciones"
          nativeButton={false}
          render={<Link href="/notificaciones" />}
        >
          <ChevronLeft aria-hidden strokeWidth={1.75} />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <span className="mb-2">
          <InsightIcon severity={data.severity} size={64} />
        </span>
        <p className="text-caption font-semibold text-ink-muted">{insightTypeLabel(data.insightType)}</p>
        <h1 className="text-title font-bold text-ink">{mask(data.title)}</h1>
        <p className="text-caption text-ink-muted">{fullDateTime(data.createdAt || data.insightDate)}</p>
      </div>

      <Card>
        <CardContent className="text-body leading-relaxed whitespace-pre-wrap text-ink">{mask(data.body)}</CardContent>
      </Card>

      {link && (
        <Button size="lg" className="w-full" nativeButton={false} render={<Link href={link.href} />}>
          {link.label}
        </Button>
      )}

      <Button
        variant="ghost"
        className="self-center text-negative hover:bg-negative-soft hover:text-negative"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? "Eliminando…" : "Eliminar notificación"}
      </Button>
    </div>
  );
}
