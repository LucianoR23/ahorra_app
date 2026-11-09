/**
 * Rows grouped by day, keeping their order (newest first in lists), with
 * each day's total in the base currency (Movimientos and Ingresos, plan 1.10b).
 */
export function groupByDay<T>(items: T[], dayOf: (item: T) => string, amountOf: (item: T) => number) {
  const groups: { day: string; total: number; items: T[] }[] = [];
  for (const item of items) {
    const day = dayOf(item).slice(0, 10);
    const last = groups.at(-1);
    if (last?.day === day) {
      last.items.push(item);
      last.total += amountOf(item);
    } else {
      groups.push({ day, total: amountOf(item), items: [item] });
    }
  }
  return groups;
}
