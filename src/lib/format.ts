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
