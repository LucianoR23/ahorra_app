"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MonthlyReportCard } from "@/components/monthly-report-card";
import { TrendsReportCard } from "@/components/trends-report-card";
import { AiExportCard } from "@/components/ai-export-card";
import { cn } from "@/lib/utils";

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
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
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
