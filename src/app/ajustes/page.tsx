import { AppShell } from "@/components/app-shell";
import { SplitRulesCard } from "@/components/split-rules-card";
import { BanksConfig } from "@/components/banks-config";
import { PaymentMethodsConfig } from "@/components/payment-methods-config";
import { HouseholdConfig } from "@/components/household-config";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Preferencias del hogar y del usuario.</p>
      </div>
      <div className="flex flex-col gap-4">
        <HouseholdConfig />
        <SplitRulesCard />
        <BanksConfig />
        <PaymentMethodsConfig />
      </div>
    </AppShell>
  );
}
