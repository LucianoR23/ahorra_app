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
