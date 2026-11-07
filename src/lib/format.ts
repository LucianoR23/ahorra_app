export function fmtARS(n: number, opts: { compact?: boolean; decimals?: number } = {}) {
  const { compact = false, decimals = 0 } = opts;
  if (compact && Math.abs(n) >= 1000 && Math.abs(n) < 1_000_000) {
    const k = n / 1000;
    return "$" + (k >= 100 ? k.toFixed(0) : k.toFixed(1)) + "k";
  }
  return (
    "$" +
    Number(n).toLocaleString("es-AR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function fmtMoney(n: number, currency: string, opts: { compact?: boolean; decimals?: number } = {}) {
  const prefix = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "$";
  const { compact = false, decimals = 0 } = opts;
  if (compact && Math.abs(n) >= 1000 && Math.abs(n) < 1_000_000) {
    const k = n / 1000;
    return prefix + (k >= 100 ? k.toFixed(0) : k.toFixed(1)) + "k";
  }
  return (
    prefix +
    Number(n).toLocaleString("es-AR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

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
  opts: { cents?: MoneyCents; income?: boolean } = {},
): string {
  const { cents = "auto", income = false } = opts;
  const value = Math.abs(amount);
  const whole = Math.round(value * 100) % 100 === 0;
  const decimals = cents === "always" || (cents === "auto" && !whole) ? 2 : 0;
  const digits = value.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const prefix = CURRENCY_PREFIX[currency] ?? currency;
  const sign = amount < 0 ? "-" : income ? "+ " : "";
  return `${sign}${prefix} ${digits}`;
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
