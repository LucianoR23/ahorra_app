export function greeting(hour: number) {
  if (hour < 12) return "Buen día";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function isoToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoMonth(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonth(): string {
  return isoMonth(new Date());
}

/** Returns first-of-month (YYYY-MM-DD) for a YYYY-MM string. */
export function monthStart(ym: string): string {
  return `${ym}-01`;
}

/** Returns last-of-month (YYYY-MM-DD) for a YYYY-MM string. */
export function monthEnd(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
}

export function fmtDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${months[m - 1]} ${y}`;
}

export function fmtMonthLong(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${months[m - 1]} ${y}`;
}

/** Projects the billing period (YYYY-MM) for a credit-card purchase based on spentAt
 * and the card's default closing day. If spentAt day <= closingDay, bills current month;
 * else bills next month. Used only as a preview — the backend is authoritative. */
export function projectBillingMonth(spentAt: string, closingDay: number): string {
  const [y, m, d] = spentAt.split("-").map(Number);
  if (!y || !m || !d) return isoMonth(new Date());
  const shift = d > closingDay ? 1 : 0;
  const year = m + shift > 12 ? y + 1 : y;
  const month = ((m + shift - 1) % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Returns YYYY-MM offset by `n` months. */
export function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

// ── Redesign formatting (plan 1.10a, design README §6) ──────────────────

export type MoneyCents = "auto" | "always" | "never";

const CURRENCY_PREFIX: Record<string, string> = { ARS: "$", USD: "US$", EUR: "€" };

/**
 * `$ 128.450,50`: es-AR digits, a space after the symbol, US$ for dollars.
 * cents "auto" (lists) drops ",00"; "always" keeps two decimals. Incomes get
 * "+ " in front; expenses carry no sign.
 */
export function formatAmount(
  amount: number,
  currency = "ARS",
  opts: { cents?: MoneyCents; income?: boolean; compact?: boolean } = {},
): string {
  const { cents = "auto", income = false, compact = false } = opts;
  const value = Math.abs(amount);
  const sign = amount < 0 ? "-" : income ? "+ " : "";
  const prefix = currencyPrefix(currency);
  if (compact && value >= 1000 && value < 1_000_000) {
    const k = value / 1000;
    const digits = k.toLocaleString("es-AR", { maximumFractionDigits: k >= 100 ? 0 : 1 });
    return `${sign}${prefix} ${digits}k`;
  }
  const whole = Math.round(value * 100) % 100 === 0;
  const decimals = cents === "always" || (cents === "auto" && !whole) ? 2 : 0;
  const digits = value.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${sign}${prefix} ${digits}`;
}

function currencyPrefix(currency: string): string {
  return CURRENCY_PREFIX[currency] ?? currency;
}

// ── Discreet mode (plan 1.9) ────────────────────────────────────────────

/** Fixed length, so a hidden amount doesn't hint at its size. */
export const MASKED_DIGITS = "••••••";

/** What a hidden amount shows: `$ ••••••`, `US$ ••••••`. */
export function maskedAmount(currency = "ARS"): string {
  return `${currencyPrefix(currency)} ${MASKED_DIGITS}`;
}

// Amounts inside API text (notification titles and bodies): "$1234.56",
// "1234.56 ARS", "US$ 10". The API writes them in these two shapes.
const AMOUNT_IN_TEXT = /(?:US\$|\$|€)\s?-?\d(?:[\d.,]*\d)?|-?\d(?:[\d.,]*\d)?\s?(?:ARS|USD|EUR)\b/g;

/** Replaces every amount in a free text with `$ ••••••`. */
export function maskAmountsInText(text: string): string {
  return text.replace(AMOUNT_IN_TEXT, maskedAmount());
}

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/**
 * Short day for lists: "Hoy", "Ayer", "Lun 2" within the last week, "3/12"
 * before that ("3/12/25" in another year). Dates are YYYY-MM-DD; `today` is
 * the caller's today in the same form (inject it in tests).
 */
export function dayLabel(iso: string, today: string = isoToday()): string {
  const diff = dayNumber(today) - dayNumber(iso);
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  if (diff > 1 && diff < 7) return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}`;
  const sameYear = today.slice(0, 4) === iso.slice(0, 4);
  return sameYear ? `${d}/${m}` : `${d}/${m}/${String(y).slice(2)}`;
}
