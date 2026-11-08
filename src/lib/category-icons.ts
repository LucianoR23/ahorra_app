// Category icons (design README §5): Lucide only, no emojis in the UI.
//
// A category stores its icon as a key from CATEGORY_ICONS (plan 1.4 migrated
// the old emojis). The API only checks the key format, so a key this list
// doesn't know shows the default icon.
import {
  Bike,
  BriefcaseMedical,
  Building2,
  Bus,
  Car,
  CarTaxiFront,
  Clapperboard,
  Coffee,
  Droplet,
  Dumbbell,
  Flame,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  KeyRound,
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
  Sofa,
  Store,
  Tag,
  Ticket,
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
  ticket: { icon: Ticket, label: "SUBE" },
  "car-taxi-front": { icon: CarTaxiFront, label: "Taxi" },
  car: { icon: Car, label: "Auto" },
  fuel: { icon: Fuel, label: "Combustible" },
  building: { icon: Building2, label: "Expensas" },
  "key-round": { icon: KeyRound, label: "Alquiler" },
  house: { icon: House, label: "Casa" },
  sofa: { icon: Sofa, label: "Hogar" },
  lightbulb: { icon: Lightbulb, label: "Servicios" },
  zap: { icon: Zap, label: "Luz" },
  flame: { icon: Flame, label: "Gas" },
  droplet: { icon: Droplet, label: "Agua" },
  wifi: { icon: Wifi, label: "Internet" },
  smartphone: { icon: Smartphone, label: "Celular" },
  "heart-pulse": { icon: HeartPulse, label: "Salud" },
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

function isKey(value: string): value is CategoryIconKey {
  return Object.hasOwn(CATEGORY_ICONS, value);
}

/** The icon key for a stored value: a known key, or the default. */
export function categoryIconKey(stored: string | null | undefined): CategoryIconKey {
  const value = stored?.trim() ?? "";
  return isKey(value) ? value : DEFAULT_CATEGORY_ICON;
}

export function categoryIcon(stored: string | null | undefined): CategoryIconDef {
  return CATEGORY_ICONS[categoryIconKey(stored)];
}
