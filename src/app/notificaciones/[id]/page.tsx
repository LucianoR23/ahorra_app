"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Info,
  Sparkles,
  ArrowLeft,
  Check,
  Trash2,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsight } from "@/lib/api/hooks";
import { markInsightRead, deleteInsight } from "@/lib/api/mutations";
import { invalidateInsights } from "@/components/insights-inbox";
import { toast, toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  daily_summary: "Resumen diario",
  weekly_review: "Resumen semanal",
  alert_goal_warning: "Alerta de meta",
  alert_goal_exceeded: "Meta excedida",
};

function severityVisual(sev: "info" | "warning" | "danger") {
  if (sev === "danger") {
    return {
      Icon: AlertTriangle,
      iconBg: "bg-destructive/10 text-destructive",
      badge: "bg-destructive/15 text-destructive",
    };
  }
  if (sev === "warning") {
    return {
      Icon: Info,
      iconBg: "bg-amber-500/10 text-amber-500",
      badge: "bg-amber-500/15 text-amber-500",
    };
  }
  return {
    Icon: Sparkles,
    iconBg: "bg-primary/10 text-primary",
    badge: "bg-primary/10 text-primary",
  };
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useInsight(id);
  const [markingRead, setMarkingRead] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleMarkRead() {
    if (!data) return;
    setMarkingRead(true);
    try {
      await markInsightRead(data.id);
      invalidateInsights();
      toast.success("Marcado como leído");
    } catch (e) {
      toastError(e, "No se pudo marcar como leído");
    } finally {
      setMarkingRead(false);
    }
  }

  async function handleDelete() {
    if (!data) return;
    setDeleting(true);
    try {
      await deleteInsight(data.id);
      invalidateInsights();
      toast.success("Notificación eliminada");
      router.push("/notificaciones");
    } catch (e) {
      toastError(e, "No se pudo eliminar");
      setDeleting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-3">
        <Link
          href="/notificaciones"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Volver a notificaciones
        </Link>
      </div>

      {isLoading && (
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="flex flex-col gap-3 p-5">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      )}

      {error && !isLoading && (
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="p-5">
            <p className="text-sm text-destructive">
              No se pudo cargar la notificación.
            </p>
          </CardContent>
        </Card>
      )}

      {data && (
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl",
                  severityVisual(data.severity).iconBg,
                )}
              >
                {(() => {
                  const { Icon } = severityVisual(data.severity);
                  return <Icon className="size-5" />;
                })()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 border-0 px-2 text-[10px]",
                      severityVisual(data.severity).badge,
                    )}
                  >
                    {TYPE_LABELS[data.insightType] ?? data.insightType}
                  </Badge>
                  {!data.isRead && (
                    <Badge className="h-5 border-0 bg-primary/15 px-2 text-[10px] text-primary">
                      Sin leer
                    </Badge>
                  )}
                </div>
                <h1 className="mt-1 text-lg font-bold leading-tight">
                  {data.title}
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(data.createdAt).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-relaxed">
              {data.body}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
              {!data.isRead && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkRead}
                  disabled={markingRead}
                >
                  {markingRead ? (
                    <Loader2 className="mr-1 size-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1 size-3.5" />
                  )}
                  Marcar como leído
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 size-3.5" />
                )}
                Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
