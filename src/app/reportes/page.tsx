"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MonthlyReportCard } from "@/components/monthly-report-card";
import { TrendsReportCard } from "@/components/trends-report-card";
import { AiExportCard } from "@/components/ai-export-card";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";
import { ViewCurrencyPicker, ViewCurrencyNote } from "@/components/view-currency";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const REPORTES_HELP: InfoHelpContent = {
  titulo: "Reportes",
  acciones: [
    "Mirá el resumen «Mensual»: gastado, facturado y a pagar, con desglose por categoría y fijo vs. variable.",
    "Navegá entre meses con las flechas (no se puede ir a meses futuros).",
    "Revisá la evolución en «Tendencias»: gastado, ingreso, a pagar y neto en 3, 6 o 12 meses.",
    "Generá en «Exportar IA» un prompt con tus datos del mes para pegar en Claude o ChatGPT.",
  ],
  consideraciones: [
    "Cada métrica usa una fecha distinta: «Gastado» es por la fecha del gasto, «Facturado» es lo que resumió la tarjeta (fecha de cierre) y «A pagar» es lo que vence ese mes (fecha de vencimiento).",
    "Los porcentajes por categoría se calculan sobre lo gastado del mes.",
    "«Fijo» son los gastos generados por recurrentes y «Variable» los cargados a mano.",
    "En Tendencias, el «Neto» es ingresos menos lo que tenés a pagar (no menos lo gastado).",
    "Los montos están en pesos. Con «US$» arriba los ves en dólares, al dólar del espacio del día de cada movimiento o al de hoy. Lo cargado en dólares queda como lo cargaste.",
    "Los reportes son de solo lectura.",
  ],
  relacionado: [
    { label: "Movimientos", href: "/movimientos" },
    { label: "Ingresos", href: "/ingresos" },
    { label: "Presupuestos y objetivos", href: "/objetivos" },
    { label: "Recurrentes", href: "/recurrentes" },
  ],
};

type TabId = "monthly" | "trends" | "ai";

export default function Page() {
  const [tab, setTab] = useState<TabId>("monthly");

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4">
        <PageHeader
          title="Reportes"
          description="Cómo viene tu plata, mes a mes."
          className="mb-0"
          action={<InfoHelp content={REPORTES_HELP} size="icon" />}
        />
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="w-full">
          <TabsList className="w-full" aria-label="Reporte">
            <TabsTrigger value="monthly">Mensual</TabsTrigger>
            <TabsTrigger value="trends">Tendencias</TabsTrigger>
            <TabsTrigger value="ai">Exportar IA</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab !== "ai" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption text-ink-muted">Ver montos en</span>
              <ViewCurrencyPicker />
            </div>
            <ViewCurrencyNote />
          </div>
        )}
        {tab === "monthly" && <MonthlyReportCard />}
        {tab === "trends" && <TrendsReportCard />}
        {tab === "ai" && <AiExportCard />}
      </div>
    </AppShell>
  );
}
