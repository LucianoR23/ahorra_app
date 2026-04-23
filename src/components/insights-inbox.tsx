"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { mutate as swrMutate } from "swr";
import {
  AlertTriangle,
  Info,
  Sparkles,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  Inbox,
  Filter,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsights, useInsightsUnreadCount } from "@/lib/api/hooks";
import {
  markInsightRead,
  markAllInsightsRead,
  deleteInsight,
} from "@/lib/api/mutations";
import type { Insight } from "@/lib/api/schemas";
import { toast, toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const TYPE_LABELS: Record<string, string> = {
  daily_summary: "Resumen diario",
  weekly_review: "Resumen semanal",
  alert: "Alerta de meta",
  alert_goal_warning: "Alerta de meta",
  alert_goal_exceeded: "Meta excedida",
  shared_expense: "Gasto compartido",
  invite: "Invitación a hogar",
  settlement: "Pago registrado",
};

type TypeFilter =
  | "all"
  | "daily_summary"
  | "weekly_review"
  | "alert"
  | "shared_expense"
  | "invite"
  | "settlement";

function invalidateInsights() {
  swrMutate(
    (k) =>
      Array.isArray(k) &&
      typeof k[0] === "string" &&
      k[0].startsWith("/insights"),
    undefined,
    { revalidate: true },
  );
}

function severityVisual(sev: Insight["severity"]) {
  if (sev === "danger") {
    return {
      Icon: AlertTriangle,
      dot: "bg-destructive",
      ring: "ring-destructive/30",
      badge: "bg-destructive/15 text-destructive",
      iconBg: "bg-destructive/10 text-destructive",
    };
  }
  if (sev === "warning") {
    return {
      Icon: Info,
      dot: "bg-amber-500",
      ring: "ring-amber-500/30",
      badge: "bg-amber-500/15 text-amber-500",
      iconBg: "bg-amber-500/10 text-amber-500",
    };
  }
  return {
    Icon: Sparkles,
    dot: "bg-primary",
    ring: "ring-primary/30",
    badge: "bg-primary/10 text-primary",
    iconBg: "bg-primary/10 text-primary",
  };
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function dayKey(iso: string): string {
  const [y, m, d] = iso.split("T")[0]?.split("-") ?? [];
  return `${y}-${m}-${d}`;
}

function humanDay(key: string): string {
  const today = new Date();
  const ty = today.getFullYear();
  const tm = String(today.getMonth() + 1).padStart(2, "0");
  const td = String(today.getDate()).padStart(2, "0");
  const todayKey = `${ty}-${tm}-${td}`;
  if (key === todayKey) return "Hoy";

  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d);
  const diffDays = Math.floor(
    (new Date(ty, today.getMonth(), today.getDate()).getTime() - date.getTime()) / 86_400_000,
  );
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return "Esta semana";
  if (diffDays < 30) return "Este mes";
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export function InsightsInbox() {
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [offset, setOffset] = useState(0);

  const typeQuery =
    typeFilter === "all"
      ? undefined
      : typeFilter === "alert"
        ? undefined
        : typeFilter;

  const { data: insights, isLoading, error } = useInsights({
    unread: onlyUnread || undefined,
    type: typeQuery,
    limit: PAGE_SIZE,
    offset,
  });

  const { data: unreadData } = useInsightsUnreadCount();
  const unreadTotal = unreadData?.unread ?? 0;

  const filtered = useMemo(() => {
    if (!insights) return [];
    if (typeFilter === "alert") {
      return insights.filter((i) =>
        i.insightType === "alert_goal_warning" || i.insightType === "alert_goal_exceeded",
      );
    }
    return insights;
  }, [insights, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Insight[]>();
    for (const i of filtered) {
      const k = dayKey(i.createdAt || i.insightDate);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const hasNextPage = (insights?.length ?? 0) === PAGE_SIZE;
  const hasPrevPage = offset > 0;

  const [markingAll, setMarkingAll] = useState(false);

  async function handleMarkAll() {
    if (unreadTotal === 0 || markingAll) return;
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex items-center gap-2 text-sm"
          aria-live="polite"
        >
          <span className="text-muted-foreground">
            {unreadTotal > 0
              ? `${unreadTotal} no leída${unreadTotal === 1 ? "" : "s"}`
              : "Todo al día"}
          </span>
          {unreadTotal > 0 && (
            <span className={cn("inline-block size-1.5 rounded-full bg-primary")} />
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleMarkAll}
          disabled={markingAll || unreadTotal === 0}
        >
          {markingAll ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCheck className="size-3.5" />
          )}
          Marcar todas como leídas
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Filtros"
        >
          <FilterChip
            icon={<Filter className="size-3" />}
            active={onlyUnread}
            onClick={() => {
              setOnlyUnread((v) => !v);
              setOffset(0);
            }}
          >
            Solo no leídas
          </FilterChip>
          <FilterChip
            active={typeFilter === "all"}
            onClick={() => {
              setTypeFilter("all");
              setOffset(0);
            }}
          >
            Todas
          </FilterChip>
          <FilterChip
            active={typeFilter === "daily_summary"}
            onClick={() => {
              setTypeFilter("daily_summary");
              setOffset(0);
            }}
          >
            Diarias
          </FilterChip>
          <FilterChip
            active={typeFilter === "weekly_review"}
            onClick={() => {
              setTypeFilter("weekly_review");
              setOffset(0);
            }}
          >
            Semanales
          </FilterChip>
          <FilterChip
            active={typeFilter === "alert"}
            onClick={() => {
              setTypeFilter("alert");
              setOffset(0);
            }}
          >
            Alertas
          </FilterChip>
          <FilterChip
            active={typeFilter === "shared_expense"}
            onClick={() => {
              setTypeFilter("shared_expense");
              setOffset(0);
            }}
          >
            Gastos compartidos
          </FilterChip>
          <FilterChip
            active={typeFilter === "invite"}
            onClick={() => {
              setTypeFilter("invite");
              setOffset(0);
            }}
          >
            Invitaciones
          </FilterChip>
          <FilterChip
            active={typeFilter === "settlement"}
            onClick={() => {
              setTypeFilter("settlement");
              setOffset(0);
            }}
          >
            Pagos
          </FilterChip>
        </div>
      </div>

      {error && (
        <Card className="rounded-2xl border-destructive/40 bg-destructive/5 shadow-card">
          <CardContent className="p-4 text-sm text-destructive">
            No pudimos cargar las notificaciones. Intentá más tarde.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-22 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onlyUnread={onlyUnread} />
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([key, items]) => (
            <section key={key} className="flex flex-col gap-1.5">
              <h2 className="px-1 text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                {humanDay(key)}
              </h2>
              <div className="flex flex-col gap-2">
                {items.map((insight) => (
                  <InsightRow key={insight.id} insight={insight} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {(hasPrevPage || hasNextPage) && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!hasPrevPage}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            <ChevronLeft className="size-3.5" /> Anterior
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {offset + 1}–{offset + filtered.length}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={!hasNextPage}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Siguiente <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-muted",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function EmptyState({ onlyUnread }: { onlyUnread: boolean }) {
  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Inbox className="size-6" />
        </div>
        <div>
          <p className="text-sm font-semibold">
            {onlyUnread ? "No hay notificaciones sin leer" : "No tenés notificaciones"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {onlyUnread
              ? "Ya estás al día con todo."
              : "Tu coach te avisará cuando haya novedades en los gastos."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const visual = severityVisual(insight.severity);
  const { Icon } = visual;
  const [optimisticRead, setOptimisticRead] = useState(insight.isRead);
  const [removing, setRemoving] = useState(false);
  const [busyAction, setBusyAction] = useState<"read" | "delete" | null>(null);

  const isRead = optimisticRead;
  const typeLabel = TYPE_LABELS[insight.insightType] ?? insight.insightType;

  async function handleMarkRead(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isRead || busyAction) return;
    setBusyAction("read");
    setOptimisticRead(true);
    try {
      await markInsightRead(insight.id);
      invalidateInsights();
    } catch (err) {
      setOptimisticRead(false);
      toastError(err, "No se pudo marcar como leída");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busyAction) return;
    setBusyAction("delete");
    setRemoving(true);
    await new Promise((r) => setTimeout(r, 200));
    try {
      await deleteInsight(insight.id);
      invalidateInsights();
    } catch (err) {
      setRemoving(false);
      setBusyAction(null);
      toastError(err, "No se pudo eliminar");
    }
  }

  return (
    <Link
      href={`/notificaciones/${insight.id}`}
      className={cn(
        "group relative flex items-start gap-3 rounded-2xl border bg-card p-3.5 text-left shadow-card outline-none transition-all duration-200",
        "hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/40",
        isRead ? "border-border/60 opacity-85" : "border-border",
        removing && "scale-[0.98] opacity-0",
      )}
      aria-label={`Notificación: ${insight.title}`}
      onClick={() => {
        if (!isRead) {
          setOptimisticRead(true);
          markInsightRead(insight.id)
            .then(() => invalidateInsights())
            .catch(() => setOptimisticRead(false));
        }
      }}
    >
      <div
        className={cn(
          "relative grid size-10 shrink-0 place-items-center rounded-xl",
          visual.iconBg,
        )}
      >
        <Icon className="size-5" />
        {!isRead && (
          <span
            aria-label="Sin leer"
            className={cn(
              "absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-card",
              visual.dot,
            )}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              visual.badge,
            )}
          >
            {typeLabel}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {relativeDate(insight.createdAt || insight.insightDate)}
          </span>
        </div>
        <p
          className={cn(
            "mt-1 line-clamp-1 text-sm tracking-tight",
            isRead ? "font-semibold" : "font-bold",
          )}
        >
          {insight.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
          {insight.body}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 sm:flex-row">
        {!isRead && (
          <button
            type="button"
            onClick={handleMarkRead}
            aria-label="Marcar como leída"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-90"
          >
            {busyAction === "read" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Eliminar notificación"
          className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-90"
        >
          {busyAction === "delete" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </button>
      </div>
    </Link>
  );
}

export { invalidateInsights };

// Named badge for navs — exported separately to avoid circular dep
export function InsightsUnreadBadge({
  className,
  dotOnly = false,
}: {
  className?: string;
  dotOnly?: boolean;
}) {
  const { data } = useInsightsUnreadCount();
  const count = data?.unread ?? 0;
  if (!count) return null;
  if (dotOnly) {
    return (
      <span
        aria-label={`${count} notificaciones sin leer`}
        className={cn(
          "block size-2 rounded-full bg-destructive ring-2 ring-background",
          className,
        )}
      />
    );
  }
  return (
    <span
      aria-label={`${count} notificaciones sin leer`}
      className={cn(
        "grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground leading-none h-4",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
