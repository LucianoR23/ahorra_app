import { AppShell } from "@/components/app-shell";
import { DebtsManager } from "@/components/debts-manager";
import { SplitRulesCard } from "@/components/split-rules-card";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Deudas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quién le debe a quién y pagos entre miembros del hogar.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <DebtsManager />
        <SplitRulesCard />
      </div>
    </AppShell>
  );
}
