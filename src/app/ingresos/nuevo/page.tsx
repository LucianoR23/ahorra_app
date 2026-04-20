import { AppShell } from "@/components/app-shell";
import { IncomeForm } from "@/components/income-form";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Nuevo ingreso</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registrá un ingreso puntual.</p>
      </div>
      <IncomeForm />
    </AppShell>
  );
}
