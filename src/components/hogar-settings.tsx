"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HouseholdConfig } from "@/components/household-config";
import { SplitRulesCard } from "@/components/split-rules-card";
import { selectSpace, useSpaces } from "@/lib/spaces";

/** Settings of the hogar, or the way to create one (plan 1.2). */
export function HogarSettings() {
  const { hogar, isLoading } = useSpaces();
  if (isLoading) return null;
  if (!hogar) return <CreateHogarCard />;
  return (
    <>
      <HouseholdConfig householdId={hogar.id} />
      <SplitRulesCard householdId={hogar.id} />
    </>
  );
}

function CreateHogarCard() {
  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="flex items-start gap-3 p-4">
        <Home className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">Hogar</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ¿Compartís gastos con alguien? Creá un hogar, invitalo y llevá las cuentas entre ustedes.
          </p>
        </div>
        <Link href="/ajustes/hogares/nuevo">
          <Button variant="outline" size="xs">
            Crear hogar
          </Button>
        </Link>
      </CardContent>
    </Card>
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
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="flex flex-col items-start gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          Las cuentas entre ustedes se llevan en el hogar. En Mi plata solo están tus gastos.
        </p>
        {hogar ? (
          <Button variant="outline" size="sm" onClick={() => selectSpace(hogar.id)}>
            Ir al hogar
          </Button>
        ) : (
          <Link href="/ajustes/hogares/nuevo">
            <Button variant="outline" size="sm">
              Crear hogar
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
