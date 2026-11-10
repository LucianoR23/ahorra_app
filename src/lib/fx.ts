import type { Rate } from "@/lib/api/schemas";

// Rate sources (plan 5.1): the DolarAPI "casas". bolsa is the MEP dollar.

export const RATE_SOURCES = [
  { value: "bolsa", label: "MEP" },
  { value: "oficial", label: "Oficial" },
  { value: "blue", label: "Blue" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "contadoconliqui", label: "CCL" },
  { value: "cripto", label: "Cripto" },
  { value: "mayorista", label: "Mayorista" },
] as const;

export type RateSource = (typeof RATE_SOURCES)[number]["value"];

export const DEFAULT_RATE_SOURCE: RateSource = "bolsa";

/** "MEP", "Tarjeta"; the raw value for one the app does not know. */
export function rateSourceLabel(source: string | null | undefined): string {
  return RATE_SOURCES.find((s) => s.value === source)?.label ?? source ?? "";
}

/** The household's source, or MEP when the API did not send one. */
export function sourceOf(fxSource: string | null | undefined): RateSource {
  return RATE_SOURCES.some((s) => s.value === fxSource) ? (fxSource as RateSource) : DEFAULT_RATE_SOURCE;
}

function priceOf(r: Rate | undefined): number | null {
  if (!r) return null;
  const v = r.rateSell > 0 ? r.rateSell : r.rateAvg;
  return v > 0 ? v : null;
}

/**
 * Pesos per unit of `currency` at `source`, as the API converts: the selling
 * price, and a euro without that source through the dollar (euro oficial ×
 * dollar at the source / dollar oficial). null when it cannot be priced.
 */
export function rateFor(rates: Rate[] | undefined, currency: string, source: string): number | null {
  if (currency === "ARS") return 1;
  if (!rates) return null;
  const find = (c: string, s: string) => priceOf(rates.find((r) => r.currency === c && r.source === s));
  const direct = find(currency, source);
  if (direct !== null || currency === "USD" || source === "oficial") return direct;
  const cur = find(currency, "oficial");
  const usd = find("USD", source);
  const usdOf = find("USD", "oficial");
  return cur !== null && usd !== null && usdOf !== null ? (cur * usd) / usdOf : null;
}

/** amount in `from` expressed in `to`, at `source`; null without the rates. */
export function convert(rates: Rate[] | undefined, amount: number, from: string, to: string, source: string) {
  if (from === to) return { amountBase: amount, rate: 1 };
  const rFrom = rateFor(rates, from, source);
  const rTo = rateFor(rates, to, source);
  if (rFrom === null || rTo === null) return null;
  return { amountBase: (amount * rFrom) / rTo, rate: rFrom / rTo };
}
