import type { BalancesMeResponse } from "@/lib/api/schemas";

/**
 * The biggest debt that involves me (Inicio · Hogar and Más, plan 1.10b):
 * who it is with, the amount, and whether they owe me. Null when even.
 */
export function biggestDebt(data: BalancesMeResponse | undefined, me: string) {
  const pair = [...(data?.owedToMe ?? []), ...(data?.owe ?? [])].sort((a, b) => b.amount - a.amount)[0];
  if (!pair) return null;
  const owedToMe = pair.to === me;
  return { ...pair, owedToMe, other: owedToMe ? pair.from : pair.to };
}
