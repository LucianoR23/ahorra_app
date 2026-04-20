import { Home, ListOrdered, Target, PieChart, Settings, Repeat, TrendingUp, Scale, type LucideIcon } from "lucide-react";

export type NavItem = {
  id: "home" | "history" | "goals" | "categories" | "settings" | "incomes" | "recurring" | "debts";
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Inicio", href: "/", icon: Home },
  { id: "history", label: "Movimientos", href: "/movimientos", icon: ListOrdered },
  { id: "incomes", label: "Ingresos", href: "/ingresos", icon: TrendingUp },
  { id: "recurring", label: "Recurrentes", href: "/recurrentes", icon: Repeat },
  { id: "debts", label: "Deudas", href: "/deudas", icon: Scale },
  { id: "categories", label: "Categorías", href: "/categorias", icon: PieChart },
  { id: "goals", label: "Objetivos", href: "/objetivos", icon: Target },
  { id: "settings", label: "Ajustes", href: "/ajustes", icon: Settings },
];
