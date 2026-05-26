"use client";

import { ArrowDown, ArrowUp, Minus, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSeriesStats } from "@/lib/api/hooks";
import { fmtMoney, fmtDateShort } from "@/lib/format";
import type { RecurringExpense, SeriesPoint } from "@/lib/api/schemas";

// SeriesStatsDialog: histórico confirmado + variación % mes a mes. Para
// recurrentes de monto fijo (Netflix) las variaciones tienden a 0 — igual
// es útil ver cuándo se generaron y por qué monto exacto. Para variables
// (luz/expensas) es el punto principal de información de la serie.
export function SeriesStatsDialog({
  recurring,
  open,
  onClose,
}: {
  recurring: RecurringExpense | null;
  open: boolean;
  onClose: () => void;
}) {
  // Pedimos hasta 12 meses para que se vea evolución anual. El backend
  // clampa a 120 si te pasás. Pasamos null cuando el modal está cerrado
  // para no disparar SWR.
  const { data, isLoading } = useSeriesStats(open && recurring ? recurring.id : null, 12);

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{recurring?.description ?? "Histórico"}</DialogTitle>
          <DialogDescription>
            {recurring?.amountIsVariable
              ? "Histórico de facturas confirmadas y variación mes a mes."
              : "Histórico de cargos generados por esta recurrente."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : !data || data.history.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <SummaryRow
              average={data.averageLastN}
              lastVariation={data.lastVariationPct ?? null}
              currency={data.history[0]?.currency ?? "ARS"}
            />
            <div className="-mx-2 flex flex-col">
              {data.history.map((p) => (
                <HistoryRow key={p.expenseId} point={p} />
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({
  average,
  lastVariation,
  currency,
}: {
  average: number;
  lastVariation: number | null;
  currency: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-muted p-3">
        <div className="text-[11px] text-muted-foreground">Promedio</div>
        <div className="mt-0.5 font-mono text-sm font-bold">
          {fmtMoney(average, currency, { decimals: 0 })}
        </div>
      </div>
      <div className="rounded-xl bg-muted p-3">
        <div className="text-[11px] text-muted-foreground">Último cambio</div>
        <div className="mt-0.5 flex items-center gap-1 font-mono text-sm font-bold">
          {lastVariation === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <>
              <VariationGlyph pct={lastVariation} />
              <span>
                {lastVariation >= 0 ? "+" : ""}
                {lastVariation.toFixed(1)}%
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ point }: { point: SeriesPoint }) {
  const v = point.variationPct ?? null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-2 py-2.5 last:border-0">
      <div>
        <div className="text-[13px] font-medium">{fmtDateShort(point.spentAt)}</div>
        {v !== null ? (
          <div
            className={`mt-0.5 flex items-center gap-1 text-[11px] ${variationColor(v)}`}
          >
            <VariationGlyph pct={v} />
            <span>
              {v >= 0 ? "+" : ""}
              {v.toFixed(1)}% vs anterior
            </span>
          </div>
        ) : (
          <div className="mt-0.5 text-[11px] text-muted-foreground">primer registro</div>
        )}
      </div>
      <div className="font-mono text-sm font-bold">
        {fmtMoney(point.amount, point.currency, { decimals: 0 })}
      </div>
    </div>
  );
}

function VariationGlyph({ pct }: { pct: number }) {
  // Umbral 0.5% para no marcar "subió/bajó" cuando es ruido del redondeo.
  if (Math.abs(pct) < 0.5) return <Minus className="size-3" />;
  return pct > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />;
}

function variationColor(pct: number): string {
  if (Math.abs(pct) < 0.5) return "text-muted-foreground";
  // En gastos, subir es "malo" (rojo), bajar es "bueno" (verde). Para
  // ingresos sería al revés, pero esto vive en el namespace de expenses.
  return pct > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400";
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-muted px-4 py-8 text-center">
      <TrendingUp className="size-6 text-muted-foreground" />
      <div className="text-sm font-medium">Sin histórico todavía</div>
      <p className="max-w-[260px] text-[12px] text-muted-foreground">
        Cuando el worker genere el primer gasto de esta serie y lo confirmes,
        vas a verlo acá con su variación.
      </p>
    </div>
  );
}
