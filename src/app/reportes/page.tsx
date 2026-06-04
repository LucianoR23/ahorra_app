"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MonthlyReportCard } from "@/components/monthly-report-card";
import { TrendsReportCard } from "@/components/trends-report-card";
import { AiExportCard } from "@/components/ai-export-card";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { cn } from "@/lib/utils";

const REPORTES_HELP: InfoHelpContent = {
  titulo: "Reportes",
  acciones: [
    "Mirá el resumen «Mensual»: gastado, facturado y a pagar, con desglose por categoría y fijo vs. variable.",
    "Navegá entre meses con «Anterior»/«Siguiente» (no se puede ir a meses futuros).",
    "Revisá la evolución en «Tendencias»: gastado, ingreso, a pagar y neto en 3, 6 o 12 meses.",
    "Generá en «Exportar IA» un prompt con tus datos del mes para pegar en Claude o ChatGPT.",
  ],
  consideraciones: [
    "Cada métrica usa una fecha distinta: «Gastado» es por la fecha del gasto, «Facturado» es lo que resumió la tarjeta (fecha de cierre) y «A pagar» es lo que vence ese mes (fecha de vencimiento).",
    "Los porcentajes por categoría se calculan sobre lo gastado del mes.",
    "«Fijo» son los gastos generados por recurrentes y «Variable» los cargados a mano.",
    "En Tendencias, el «Neto» es ingresos menos lo que tenés a pagar (no menos lo gastado).",
    "Todos los montos están en la moneda base del hogar y los reportes son de solo lectura.",
  ],
  relacionado: [
    { label: "Movimientos", href: "/movimientos" },
    { label: "Ingresos", href: "/ingresos" },
    { label: "Objetivos", href: "/objetivos" },
    { label: "Recurrentes", href: "/recurrentes" },
  ],
};

const TABS = [
  { id: "monthly", label: "Mensual" },
  { id: "trends", label: "Tendencias" },
  { id: "ai", label: "Exportar IA" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Page() {
  const [tab, setTab] = useState<TabId>("monthly");

  return (
    <AppShell>
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <InfoHelp content={REPORTES_HELP} size="icon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Analizá tus finanzas del hogar.</p>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 cursor-pointer rounded-lg py-1.5 text-xs font-semibold transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "monthly" && <MonthlyReportCard />}
      {tab === "trends" && <TrendsReportCard />}
      {tab === "ai" && <AiExportCard />}
    </AppShell>
  );
}
