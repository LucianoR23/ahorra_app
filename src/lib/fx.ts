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

/**
 * Whether pricing `currency` at `source` relies on a stale rate (plan 5.2):
 * the rate itself, or, for a euro priced through the dollar, any of the
 * three it uses. Pesos are never stale.
 */
export function isStale(rates: Rate[] | undefined, currency: string, source: string): boolean {
  if (currency === "ARS" || !rates) return false;
  const row = (c: string, s: string) => rates.find((r) => r.currency === c && r.source === s);
  const direct = row(currency, source);
  if (direct || currency === "USD" || source === "oficial") return !!direct?.stale;
  return [row(currency, "oficial"), row("USD", source), row("USD", "oficial")].some((r) => !!r?.stale);
}

/** The warning under a conversion that uses a stale rate. */
export const STALE_RATE_WARNING = "Ojo: esta cotización no se actualizó en el último día.";

/** The selling price of a history point, the average without one. */
export function historyPrice(p: { rateSell: number; rateAvg: number }): number {
  return p.rateSell > 0 ? p.rateSell : p.rateAvg;
}

/** How much a dollar moved over its history: last vs first, in percent. */
export function periodChange(points: { rateSell: number; rateAvg: number }[]): number | null {
  if (points.length < 2) return null;
  const first = historyPrice(points[0]);
  const last = historyPrice(points[points.length - 1]);
  return first > 0 ? ((last - first) / first) * 100 : null;
}

/** The currency a report's amounts are in (plan 5.3). */
export function reportCurrency(r: { currency?: string; baseCurrency: string } | undefined): string {
  return r?.currency ?? r?.baseCurrency ?? "ARS";
}
