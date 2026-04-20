// Mock data temporal — reemplazar con fetch al API (/expenses, /reports/monthly, /insights, /balances/me)

export type Category = { id: string; name: string; emoji: string; hue: number };

export const CATEGORIES: Category[] = [
  { id: "food", name: "Comida", emoji: "🍜", hue: 22 },
  { id: "transport", name: "Transporte", emoji: "🚖", hue: 210 },
  { id: "rent", name: "Alquiler", emoji: "🏠", hue: 280 },
  { id: "entertainment", name: "Ocio", emoji: "🎬", hue: 340 },
  { id: "shopping", name: "Compras", emoji: "🛍️", hue: 180 },
  { id: "health", name: "Salud", emoji: "💊", hue: 140 },
  { id: "subscriptions", name: "Suscripciones", emoji: "📺", hue: 260 },
  { id: "bills", name: "Servicios", emoji: "⚡", hue: 50 },
];

export type ExpenseRow = {
  id: number;
  cat: string;
  desc: string;
  amount: number;
  date: string;
  time: string;
  recurring?: boolean;
};

export const EXPENSES: ExpenseRow[] = [
  { id: 1, cat: "food", desc: "El Preferido de Palermo", amount: 28400, date: "today", time: "20:45" },
  { id: 2, cat: "transport", desc: "SUBE", amount: 1200, date: "today", time: "18:12" },
  { id: 3, cat: "subscriptions", desc: "Spotify Premium", amount: 4599, date: "today", time: "09:00", recurring: true },
  { id: 4, cat: "food", desc: "Coto — semanal", amount: 42300, date: "ayer", time: "11:30" },
  { id: 5, cat: "entertainment", desc: "Cine Hoyts", amount: 8900, date: "ayer", time: "22:00" },
];

export const MONTH_TOTAL = 417299;
export const BUDGET = 650000;
export const TODAY_TOTAL = 34199;

export const INSIGHT = {
  headline: "Viernes = tu día caro",
  body: "El 38% de tu gasto de ocio pasa los viernes. No digo que no salgas — digo que planifiques un tope.",
  tip: "Poné $25.000 como límite y cerrá la app de delivery a las 23h.",
};
