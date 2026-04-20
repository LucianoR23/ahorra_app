import { AppShell } from "@/components/app-shell";
import { ExpenseForm } from "@/components/expense-form";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Agregar gasto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registrá un gasto nuevo. Si usás tarjeta de crédito se divide automáticamente en cuotas.
        </p>
      </div>
      <ExpenseForm />
    </AppShell>
  );
}
