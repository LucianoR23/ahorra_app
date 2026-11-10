// "¿Me lo puedo comprar?" (plan 4.8): the math the app does itself.

/**
 * What a plan of `installments` equal payments of `perInstallment`, the first
 * one a month from now, is worth today when your money earns `monthlyRatePct`
 * a month. Paying in installments beats paying cash when this is below the
 * cash price.
 */
export function presentValue(perInstallment: number, installments: number, monthlyRatePct: number): number {
  const r = monthlyRatePct / 100;
  if (r <= 0) return perInstallment * installments;
  let total = 0;
  for (let k = 1; k <= installments; k++) total += perInstallment / (1 + r) ** k;
  return total;
}

/** Cuotas o contado: which one costs less in today's money, and by how much. */
export function cashOrInstallments(
  cashPrice: number,
  installmentsTotal: number,
  installments: number,
  monthlyRatePct: number,
): { best: "cuotas" | "contado" | "igual"; presentValue: number; difference: number } {
  const pv = presentValue(installmentsTotal / installments, installments, monthlyRatePct);
  const difference = Math.abs(cashPrice - pv);
  if (difference < 0.5) return { best: "igual", presentValue: pv, difference: 0 };
  return { best: pv < cashPrice ? "cuotas" : "contado", presentValue: pv, difference };
}

export type ExpensePrefill = {
  amount?: number;
  currency?: string;
  paymentMethodId?: string;
  installments?: number;
  categoryId?: string;
};

/** "Cargar compra": Cargar gasto with the simulated purchase filled in. */
export function prefillHref(p: ExpensePrefill): string {
  const q = new URLSearchParams();
  if (p.amount) q.set("amount", String(p.amount));
  if (p.currency) q.set("currency", p.currency);
  if (p.paymentMethodId) q.set("paymentMethodId", p.paymentMethodId);
  if (p.installments && p.installments > 1) q.set("installments", String(p.installments));
  if (p.categoryId) q.set("categoryId", p.categoryId);
  const s = q.toString();
  return s ? `/agregar?${s}` : "/agregar";
}

const CURRENCIES = ["ARS", "USD", "EUR"];

/** Reads a prefill back from Cargar gasto's query, dropping what does not parse. */
export function parsePrefill(params: Record<string, string | string[] | undefined>): ExpensePrefill {
  const one = (k: string) => {
    const v = params[k];
    return typeof v === "string" && v.length <= 100 ? v : undefined;
  };
  const out: ExpensePrefill = {};
  const amount = Number(one("amount"));
  if (Number.isFinite(amount) && amount > 0) out.amount = amount;
  const currency = one("currency");
  if (currency && CURRENCIES.includes(currency)) out.currency = currency;
  const pm = one("paymentMethodId");
  if (pm) out.paymentMethodId = pm;
  const n = Number(one("installments"));
  if (Number.isInteger(n) && n >= 1 && n <= 60) out.installments = n;
  const cat = one("categoryId");
  if (cat) out.categoryId = cat;
  return out;
}
