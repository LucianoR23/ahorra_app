"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { MonthNavigator } from "@/components/ui/month-navigator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiExport } from "@/lib/api/hooks";
import { currentMonth } from "@/lib/format";
import { toast } from "@/lib/toast";

function buildSystemPrompt(backendPrompt: string): string {
  const preamble = `Sos un asesor financiero personal especializado. Tu única fuente de información son los datos reales del usuario que se incluyen más abajo.

REGLAS DE COMPORTAMIENTO:
- Trabajá EXCLUSIVAMENTE con los datos provistos. No busques información externa, no hagas suposiciones sobre precios de mercado ni tasas actuales.
- No recomiendes productos financieros específicos (fondos de inversión, acciones, criptomonedas, etc.) — tu foco es analizar los patrones de gasto y ahorro reales.
- No sugieras herramientas, apps ni recursos externos.
- Identificá tendencias, anomalías y oportunidades de ahorro dentro del presupuesto actual.
- Si hay categorías con gasto elevado respecto a meses anteriores, señalalo con datos concretos.
- Respondé siempre en español, con tono directo, práctico y sin rodeos.
- Si algo no queda claro en los datos, pedí aclaración en lugar de suponer.
- Terminá cada análisis con 2-3 acciones concretas que el usuario puede tomar esta semana.

---

DATOS DEL PERÍODO:

`;
  return preamble + backendPrompt;
}

/**
 * Reportes · Exportar IA (plan 1.10b): the month in figures and a prompt
 * with them to paste into Claude or ChatGPT.
 */
export function AiExportCard() {
  const [month, setMonth] = useState(currentMonth());
  const { data, isLoading } = useAiExport(month);
  const [copied, setCopied] = useState(false);

  const cur = data?.baseCurrency ?? "ARS";
  const fullPrompt = data ? buildSystemPrompt(data.prompt) : "";
  const top = (data?.topCategories ?? []).slice(0, 5);

  async function handleCopy() {
    if (!fullPrompt) return;
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar. Seleccioná el texto y copialo a mano.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <MonthNavigator
        month={month}
        onMonthChange={setMonth}
        max={currentMonth()}
        className="border-0 bg-card shadow-card dark:ring-1 dark:ring-border"
      />

      {isLoading ? (
        <>
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </>
      ) : !data ? (
        <EmptyState icon={Sparkles} title="Sin datos para este mes" description="Cargá tus gastos y volvé para armar el análisis." />
      ) : (
        <>
          <Card className="py-1">
            <CardContent>
              <dl className="divide-y divide-border text-body">
                <Row label="Gastado" value={<Money amount={data.spent} currency={cur} />} />
                <Row label="Facturado" value={<Money amount={data.billed} currency={cur} />} />
                <Row
                  label="Fijo"
                  value={
                    <>
                      <span className="mr-2 text-caption font-normal text-ink-muted">{Math.round(data.fixedPct)}%</span>
                      <Money amount={data.fixedTotal} currency={cur} />
                    </>
                  }
                />
                <Row label="Variable" value={<Money amount={data.variableTotal} currency={cur} />} />
                {top.length > 0 && (
                  <Row label="Más gasto en" value={top.map((c) => `${c.name} ${Math.round(c.pct)}%`).join(" · ")} />
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-heading font-semibold">Prompt para tu IA</h2>
                <Button variant="secondary" onClick={handleCopy} disabled={!fullPrompt}>
                  {copied ? <Check aria-hidden className="text-positive" strokeWidth={1.75} /> : <Copy aria-hidden strokeWidth={1.75} />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <p className="text-caption text-ink-muted">Pegalo en Claude o ChatGPT para que analice tus gastos del mes.</p>
              <pre className="max-h-64 overflow-y-auto rounded-xl bg-surface-2 p-4 font-mono text-caption leading-relaxed whitespace-pre-wrap text-ink">
                {fullPrompt}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-2">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
