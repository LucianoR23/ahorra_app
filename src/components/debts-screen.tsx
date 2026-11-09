"use client";

import { DebtsManager } from "@/components/debts-manager";
import { HogarOnly } from "@/components/hogar-settings";
import { SplitRulesCard } from "@/components/split-rules-card";

/** Debts and split rules of the hogar; from "Mi plata", the way to the hogar (plan 1.2). */
export function DebtsScreen() {
  return (
    <HogarOnly>
      {(hogarId) => (
        <div className="flex flex-col gap-6">
          <DebtsManager />
          <SplitRulesCard householdId={hogarId} />
        </div>
      )}
    </HogarOnly>
  );
}
