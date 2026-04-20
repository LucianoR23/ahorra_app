import { AppShell } from "@/components/app-shell";
import { IncomesList } from "@/components/incomes-list";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Ingresos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sueldo, freelance, regalos — todo lo que entra al hogar.</p>
      </div>
      <IncomesList />
    </AppShell>
  );
}
