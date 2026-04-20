import { AppShell } from "@/components/app-shell";
import { RecurringManager } from "@/components/recurring-manager";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Recurrentes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gastos e ingresos que se generan solos cada mes a las 00:30.
        </p>
      </div>
      <RecurringManager />
    </AppShell>
  );
}
