import type { CurrencyAmount } from "@/lib/api/schemas";

// "Comprometido" and "Cuotas en curso" (plan 4.2): what the screens say.

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function split(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { y, m };
}

/** "diciembre" */
export function monthName(ym: string): string {
  return MONTHS[split(ym).m - 1];
}

/** "Dic" */
export function monthShort(ym: string): string {
  const name = monthName(ym);
  return name.charAt(0).toUpperCase() + name.slice(1, 3);
}

/** "termina en febrero", or "termina en agosto de 2027" outside the current year. */
export function endsIn(lastPeriodYm: string, today = new Date()): string {
  const { y } = split(lastPeriodYm);
  return y === today.getFullYear() ? `termina en ${monthName(lastPeriodYm)}` : `termina en ${monthName(lastPeriodYm)} de ${y}`;
}

/** The amount in one currency, 0 when there is none. */
export function amountIn(totals: CurrencyAmount[], currency: string): number {
  return totals.find((t) => t.currency === currency)?.amount ?? 0;
}
