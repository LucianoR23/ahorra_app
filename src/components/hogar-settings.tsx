"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HouseholdConfig } from "@/components/household-config";
import { SplitRulesCard } from "@/components/split-rules-card";
import { selectSpace, useSpaces } from "@/lib/spaces";

/** Settings of the hogar, or the way to create one (plan 1.2). */
export function HogarSettings() {
  const { hogar, isLoading } = useSpaces();
  if (isLoading) return null;
  if (!hogar) {
    return (
      <EmptyState
        icon={Users}
        title="Todavía no compartís gastos"
        description="Creá un hogar, invitá a quien vive con vos y llevá las cuentas entre ustedes."
        action={
          <Button variant="outline" nativeButton={false} render={<Link href="/hogar/nuevo" />}>
            Crear hogar
          </Button>
        }
      />
    );
  }
  return (
    <HouseholdConfig householdId={hogar.id}>
      <SplitRulesCard householdId={hogar.id} />
    </HouseholdConfig>
  );
}

/**
 * Wraps screens that only make sense in the hogar (debts). From "Mi plata"
 * it offers to switch to the hogar, or to create one.
 */
export function HogarOnly({ children }: { children: (hogarId: string) => React.ReactNode }) {
  const { hogar, inHogar, isLoading } = useSpaces();
  if (isLoading) return null;
  if (hogar && inHogar) return <>{children(hogar.id)}</>;
  return (
    <EmptyState
      icon={Users}
      title="Las cuentas son del hogar"
      description="En Mi plata solo están tus gastos. Las cuentas entre ustedes se llevan en el hogar."
      action={
        hogar ? (
          <Button variant="outline" onClick={() => selectSpace(hogar.id)}>
            Ir al hogar
          </Button>
        ) : (
          <Button variant="outline" nativeButton={false} render={<Link href="/hogar/nuevo" />}>
            Crear hogar
          </Button>
        )
      }
    />
  );
}
