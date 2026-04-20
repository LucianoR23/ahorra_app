import { AppShell } from "@/components/app-shell";
import { GoalsManager } from "@/components/goals-manager";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Objetivos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Límites de gasto y metas de ahorro con progreso en vivo.
        </p>
      </div>
      <GoalsManager />
    </AppShell>
  );
}
