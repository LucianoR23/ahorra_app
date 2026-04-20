"use client";

import { useState } from "react";
import { Copy, Check, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAiExport } from "@/lib/api/hooks";
import { fmtMoney } from "@/lib/format";

function isoMonthCurrent() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const names = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${names[Number(m) - 1]} ${y}`;
}

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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

export function AiExportCard() {
  const [month, setMonth] = useState(isoMonthCurrent());
  const { data, isLoading } = useAiExport(month);
  const [copied, setCopied] = useState(false);

  const cur = (data?.baseCurrency as "ARS" | "USD" | "EUR") ?? "ARS";
  const fullPrompt = data ? buildSystemPrompt(data.prompt) : "";

  async function handleCopy() {
    if (!fullPrompt) return;
    await navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const isCurrentOrFuture = month >= isoMonthCurrent();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(prevMonth(month))}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          ‹ Anterior
        </button>
        <span className="text-sm font-bold">{monthLabel(month)}</span>
        <button
          type="button"
          onClick={() => setMonth(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`)}
          disabled={isCurrentOrFuture}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente ›
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : !data ? (
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Sin datos para este mes.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-2xl border-0 shadow-card">
            <CardContent className="p-4">
              <p className="mb-2 text-[11px] font-semibold text-muted-foreground">Resumen del mes</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gastado</span>
                  <span className="font-mono font-bold">{fmtMoney(data.spent, cur)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Facturado</span>
                  <span className="font-mono font-bold">{fmtMoney(data.billed, cur)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fijo</span>
                  <span className="font-mono font-bold">{fmtMoney(data.fixedTotal, cur)} ({data.fixedPct.toFixed(0)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Variable</span>
                  <span className="font-mono font-bold">{fmtMoney(data.variableTotal, cur)}</span>
                </div>
              </div>
              {data.topCategories.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-[10px] font-semibold text-muted-foreground">Top categorías</p>
                  <div className="flex flex-col gap-0.5">
                    {data.topCategories.slice(0, 5).map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span>{c.name}</span>
                        <span className="font-mono font-semibold">{c.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-card">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bot className="size-4 text-primary" />
                  <p className="text-xs font-bold">Prompt para IA financiera</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleCopy} disabled={!fullPrompt}>
                  {copied ? (
                    <><Check className="mr-1 size-3.5 text-emerald-500" /> Copiado</>
                  ) : (
                    <><Copy className="mr-1 size-3.5" /> Copiar</>
                  )}
                </Button>
              </div>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Copiá este prompt y pegalo en Claude o ChatGPT para obtener un análisis detallado de tus finanzas.
              </p>
              <div className="max-h-64 overflow-y-auto rounded-lg bg-muted/50 p-3">
                <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-foreground/80">
                  {fullPrompt}
                </pre>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
