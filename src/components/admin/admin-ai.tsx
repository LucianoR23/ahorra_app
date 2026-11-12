"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { MenuGroup, MenuRow } from "@/components/ui/menu-list";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAI } from "@/lib/api/hooks";

const num = new Intl.NumberFormat("es-AR");
const usdFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** Millionths of a dollar → "US$ 0,0125". */
export function usd(micro: number): string {
  return usdFmt.format(micro / 1e6);
}

const TASKS: Record<string, string> = {
  parse_expense: "Carga en una frase",
  parse_receipt: "Foto de ticket",
  parse_audio: "Voz",
  parse_email: "Mails reenviados",
  parse_statement_pdf: "Resumen de tarjeta",
  categorize: "Categoría automática",
  summarize: "Resúmenes",
  answer_finance_question: "Preguntas",
};

function Stat({ label, value, hint, children }: { label: string; value: string; hint?: string; children?: React.ReactNode }) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">{label}</span>
        <span className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-ink tabular-nums">{value}</span>
        {hint ? <span className="text-caption text-ink-muted">{hint}</span> : null}
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * AI spend (plan 8.1, §8.6): what the providers cost today and this month,
 * by task and by person. Metrics only; the panel never sees what people
 * sent to the AI.
 */
export function AdminAI() {
  const { data, error, isLoading } = useAdminAI();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="IA" description="Lo que cuestan los proveedores de IA. Solo métricas: nunca lo que la gente les manda." className="mb-0" />
      {error ? (
        <Alert variant="error">No se pudo cargar el gasto en IA.</Alert>
      ) : isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <AIBody data={data} />
      )}
    </div>
  );
}

function AIBody({ data }: { data: NonNullable<ReturnType<typeof useAdminAI>["data"]> }) {
  const { limits, today, month } = data;
  const used = limits.dailyBudgetMicroUsd > 0 ? Math.min(100, Math.round((today.costMicroUsd / limits.dailyBudgetMicroUsd) * 100)) : 0;

  return (
    <>
      {!data.enabled ? (
        <Alert variant="warning">La IA está apagada. Se prende con AI_ENABLED=true en el servidor.</Alert>
      ) : used >= 100 ? (
        <Alert variant="warning">Se llegó al presupuesto de hoy: la IA queda pausada hasta la medianoche y la gente carga a mano.</Alert>
      ) : null}
      <section aria-label="Gasto en IA" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Hoy" value={usd(today.costMicroUsd)} hint={`${used}% de ${usd(limits.dailyBudgetMicroUsd)} por día`}>
          <Progress value={used} aria-label="Presupuesto de hoy usado" className="mt-1" />
        </Stat>
        <Stat label="Este mes" value={usd(month.costMicroUsd)} hint={`${num.format(month.calls)} pedidos`} />
        <Stat
          label="Pedidos hoy"
          value={num.format(today.calls)}
          hint={`${num.format(today.errors)} con error · ${num.format(today.blocked)} frenados por los topes`}
        />
        <Stat label="Demora promedio hoy" value={`${num.format(today.avgLatencyMs)} ms`} />
      </section>

      <MenuGroup title="Por tarea, este mes" footer={data.byTask.length === 0 ? "Todavía no hubo pedidos a la IA este mes." : undefined}>
        {data.byTask.map((t) => (
          <MenuRow key={t.task} className="justify-between">
            <span>{TASKS[t.task] ?? t.task}</span>
            <span className="text-right text-caption text-ink-muted tabular-nums">
              {usd(t.costMicroUsd)} · {num.format(t.calls)} pedidos
              {t.errors > 0 ? ` · ${num.format(t.errors)} con error` : ""}
              {t.blocked > 0 ? ` · ${num.format(t.blocked)} frenados` : ""}
            </span>
          </MenuRow>
        ))}
      </MenuGroup>

      <MenuGroup
        title="Quién más gasta, este mes"
        footer={`Topes por persona: ${usd(limits.userDailyMicroUsd)} por día, ${num.format(limits.perMinute)} pedidos por minuto y ${num.format(limits.perDay)} por día.`}
      >
        {data.topUsers.map((u) => (
          <MenuRow key={u.userId} className="justify-between">
            <Link
              href={`/admin/cuentas/${u.userId}`}
              className="min-w-0 truncate text-ink underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {u.email}
            </Link>
            <span className="shrink-0 text-right text-caption text-ink-muted tabular-nums">
              {usd(u.costMicroUsd)} · {num.format(u.calls)} pedidos
              {u.blocked > 0 ? ` · ${num.format(u.blocked)} frenados` : ""}
            </span>
          </MenuRow>
        ))}
      </MenuGroup>
    </>
  );
}
