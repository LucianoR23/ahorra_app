import { AppShell } from "@/components/app-shell";
import { ExpensesList } from "@/components/expenses-list";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Movimientos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Filtrá por mes, categoría, medio de pago o tipo.</p>
        </div>
      </div>
      <ExpensesList />
    </AppShell>
  );
}
