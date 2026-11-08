import type { PaymentMethodCreateInput } from "@/lib/api/mutations";
import type { CardNetwork } from "@/lib/api/schemas";

// Plan 1.3: the onboarding's presets and the pure logic behind its steps.

export type { CardNetwork };

export const NETWORK_LABELS: Record<CardNetwork, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  cabal: "Cabal",
  naranja: "Naranja",
  maestro: "Maestro",
  other: "Otra",
};

/** "¿Cómo pagás?" options, in the design's order. */
export type PayOption = "visa" | "mastercard" | "amex" | "mercadopago" | "cash";
export const PAY_OPTIONS: readonly { value: PayOption; label: string; kind: "card" | "wallet" | "cash" }[] = [
  { value: "visa", label: "Visa", kind: "card" },
  { value: "mastercard", label: "Mastercard", kind: "card" },
  { value: "amex", label: "American Express", kind: "card" },
  { value: "mercadopago", label: "Mercado Pago", kind: "wallet" },
  { value: "cash", label: "Efectivo o débito", kind: "cash" },
];

/** Issuers offered for a card; the user's own banks come first. */
export const AR_BANKS = [
  "Galicia",
  "Santander",
  "BBVA",
  "Macro",
  "Nación",
  "Provincia",
  "Ciudad",
  "ICBC",
  "Credicoop",
  "Patagonia",
  "Supervielle",
  "HSBC",
  "Comafi",
  "Hipotecario",
  "Brubank",
  "Naranja X",
  "Mercado Pago",
] as const;

export const MERCADO_PAGO = "Mercado Pago";

/** A card being set up in step 3. `bank` is a name; "" means none chosen. */
export type CardDraft = {
  key: string;
  network: CardNetwork;
  bank: string;
  /** Fixed issuer (the Mercado Pago card); the bank picker is hidden. */
  bankLocked: boolean;
  closingDay: string;
  dueDay: string;
};

/** The cards step drafts for what the user picked in "¿Cómo pagás?". */
export function cardDrafts(selected: ReadonlySet<PayOption>, hasMercadoPagoCard: boolean): CardDraft[] {
  const drafts: CardDraft[] = [];
  for (const network of ["visa", "mastercard", "amex"] as const) {
    if (selected.has(network)) {
      drafts.push({ key: network, network, bank: "", bankLocked: false, closingDay: "", dueDay: "" });
    }
  }
  if (selected.has("mercadopago") && hasMercadoPagoCard) {
    drafts.push({ key: "mercadopago-card", network: "mastercard", bank: MERCADO_PAGO, bankLocked: true, closingDay: "", dueDay: "" });
  }
  return drafts;
}

/** "<Network> <Bank>", or just the network while no bank is chosen. */
export function defaultCardName(network: CardNetwork, bank: string): string {
  const b = bank.trim();
  return b ? `${NETWORK_LABELS[network]} ${b}` : NETWORK_LABELS[network];
}

/** Bank options: the user's banks first, then the presets they don't have. */
export function bankOptions(own: readonly string[]): string[] {
  const seen = new Set(own.map((n) => n.toLocaleLowerCase("es-AR")));
  return [...own, ...AR_BANKS.filter((b) => !seen.has(b.toLocaleLowerCase("es-AR")))];
}

/** A day of the month typed by the user, or null when it isn't 1 to 31. */
export function parseDay(raw: string): number | null {
  if (!/^\d{1,2}$/.test(raw.trim())) return null;
  const n = Number(raw);
  return n >= 1 && n <= 31 ? n : null;
}

function daysIn(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function iso(year: number, month0: number, day: number): string {
  const d = new Date(Date.UTC(year, month0, Math.min(day, daysIn(year, month0))));
  return d.toISOString().slice(0, 10);
}

/**
 * The card's next statement from its days: the first closing on or after
 * `today`, and the due date after it (same month when the due day is later,
 * else the next month; the API's rule in expenses/periods.go). Days past
 * the end of a month fall on its last day.
 */
export function periodFromDays(today: string, closingDay: number, dueDay: number): { closingDate: string; dueDate: string } {
  const [y, m] = today.split("-").map(Number);
  let year = y;
  let month0 = m - 1;
  if (iso(year, month0, closingDay) < today) {
    month0 += 1;
    if (month0 === 12) {
      month0 = 0;
      year += 1;
    }
  }
  const closingDate = iso(year, month0, closingDay);
  let dueYear = year;
  let dueMonth0 = month0;
  if (dueDay <= closingDay) {
    dueMonth0 += 1;
    if (dueMonth0 === 12) {
      dueMonth0 = 0;
      dueYear += 1;
    }
  }
  return { closingDate, dueDate: iso(dueYear, dueMonth0, dueDay) };
}

/** What a draft still needs before it can be saved, or null when it is complete. */
export function cardDraftError(d: CardDraft): string | null {
  if (!d.bank.trim()) return "Elegí el banco";
  if (parseDay(d.closingDay) === null) return "El cierre es un día del 1 al 31";
  if (parseDay(d.dueDay) === null) return "El vencimiento es un día del 1 al 31";
  return null;
}

/** POST /payment-methods body for a complete draft. */
export function cardInput(d: CardDraft, bankId: string, name: string, today: string): PaymentMethodCreateInput {
  const closing = parseDay(d.closingDay)!;
  const due = parseDay(d.dueDay)!;
  const alias = name.trim() || defaultCardName(d.network, d.bank);
  return {
    name: alias,
    kind: "credit",
    bankId,
    allowsInstallments: true,
    creditCard: {
      alias,
      network: d.network,
      defaultClosingDay: closing,
      defaultDueDay: due,
      currentPeriod: periodFromDays(today, closing, due),
    },
  };
}

/** Non-card payment methods for the picked options ("Efectivo" already exists). */
export function otherMethodInputs(selected: ReadonlySet<PayOption>): PaymentMethodCreateInput[] {
  const out: PaymentMethodCreateInput[] = [];
  if (selected.has("mercadopago")) out.push({ name: MERCADO_PAGO, kind: "wallet", allowsInstallments: false });
  if (selected.has("cash")) out.push({ name: "Débito", kind: "debit", allowsInstallments: false });
  return out;
}

/** Same name, ignoring case and spaces: payment method names are unique per user. */
export function findByName<T extends { name: string }>(list: readonly T[] | undefined, name: string): T | undefined {
  const key = name.trim().toLocaleLowerCase("es-AR");
  return list?.find((x) => x.name.trim().toLocaleLowerCase("es-AR") === key);
}
