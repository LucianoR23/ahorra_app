// Category icons (design README §5): Lucide only, no emojis in the UI.
//
// A category stores its icon as a key from CATEGORY_ICONS. Older categories
// still store an emoji (the API default and seeds); EMOJI_TO_KEY translates
// them when shown. Plan 1.4 migrates the stored data and drops the emoji map.
import {
  Bike,
  BriefcaseMedical,
  Building2,
  Bus,
  Car,
  Clapperboard,
  Coffee,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  House,
  Landmark,
  Lightbulb,
  type LucideIcon,
  Package,
  PawPrint,
  Pill,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  Tag,
  Tv,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";

export type CategoryIconDef = { icon: LucideIcon; label: string };

export const CATEGORY_ICONS = {
  "shopping-cart": { icon: ShoppingCart, label: "Súper" },
  store: { icon: Store, label: "Almacén" },
  bike: { icon: Bike, label: "Delivery" },
  utensils: { icon: Utensils, label: "Comida" },
  coffee: { icon: Coffee, label: "Café" },
  bus: { icon: Bus, label: "Transporte" },
  car: { icon: Car, label: "Auto" },
  fuel: { icon: Fuel, label: "Combustible" },
  building: { icon: Building2, label: "Expensas" },
  house: { icon: House, label: "Casa" },
  zap: { icon: Zap, label: "Luz" },
  lightbulb: { icon: Lightbulb, label: "Servicios" },
  wifi: { icon: Wifi, label: "Internet" },
  smartphone: { icon: Smartphone, label: "Celular" },
  "briefcase-medical": { icon: BriefcaseMedical, label: "Prepaga" },
  pill: { icon: Pill, label: "Farmacia" },
  "graduation-cap": { icon: GraduationCap, label: "Educación" },
  tv: { icon: Tv, label: "Suscripciones" },
  clapperboard: { icon: Clapperboard, label: "Salidas" },
  dumbbell: { icon: Dumbbell, label: "Deporte" },
  "paw-print": { icon: PawPrint, label: "Mascotas" },
  shirt: { icon: Shirt, label: "Ropa" },
  "shopping-bag": { icon: ShoppingBag, label: "Compras" },
  gift: { icon: Gift, label: "Regalos" },
  plane: { icon: Plane, label: "Viajes" },
  landmark: { icon: Landmark, label: "Impuestos" },
  wrench: { icon: Wrench, label: "Arreglos" },
  wallet: { icon: Wallet, label: "Plata" },
  package: { icon: Package, label: "Otros" },
  tag: { icon: Tag, label: "Etiqueta" },
} as const satisfies Record<string, CategoryIconDef>;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;

export const DEFAULT_CATEGORY_ICON: CategoryIconKey = "tag";

/** Emojis stored by older categories (API seeds and default included). */
const EMOJI_TO_KEY: Record<string, CategoryIconKey> = {
  "💰": "wallet",
  "💵": "wallet",
  "🍕": "utensils",
  "🍔": "utensils",
  "🍜": "utensils",
  "🍽️": "utensils",
  "☕": "coffee",
  "🛒": "shopping-cart",
  "🏠": "house",
  "🏢": "building",
  "🚗": "car",
  "🚖": "car",
  "🚕": "car",
  "🚌": "bus",
  "⛽": "fuel",
  "🎬": "clapperboard",
  "🎮": "clapperboard",
  "💡": "lightbulb",
  "⚡": "zap",
  "📶": "wifi",
  "📱": "smartphone",
  "💊": "pill",
  "🏥": "briefcase-medical",
  "📚": "graduation-cap",
  "🎓": "graduation-cap",
  "📺": "tv",
  "🏋️": "dumbbell",
  "🐶": "paw-print",
  "🐱": "paw-print",
  "👕": "shirt",
  "🛍️": "shopping-bag",
  "🎁": "gift",
  "✈️": "plane",
  "🏛️": "landmark",
  "🔧": "wrench",
  "📦": "package",
};

function isKey(value: string): value is CategoryIconKey {
  return Object.hasOwn(CATEGORY_ICONS, value);
}

/** The icon key for a stored value: a key, a known emoji, or the default. */
export function categoryIconKey(stored: string | null | undefined): CategoryIconKey {
  const value = stored?.trim() ?? "";
  if (isKey(value)) return value;
  // Emoji variation selectors (U+FE0F) come and go between keyboards.
  const bare = value.replace(/\u{FE0F}/gu, "");
  for (const candidate of [value, bare, `${bare}\u{FE0F}`]) {
    if (Object.hasOwn(EMOJI_TO_KEY, candidate)) return EMOJI_TO_KEY[candidate];
  }
  return DEFAULT_CATEGORY_ICON;
}

export function categoryIcon(stored: string | null | undefined): CategoryIconDef {
  return CATEGORY_ICONS[categoryIconKey(stored)];
}
