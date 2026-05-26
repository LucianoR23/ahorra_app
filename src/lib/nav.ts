import { Home, ListOrdered, Target, PieChart, Settings, Repeat, TrendingUp, Scale, BarChart2, Shield, ShieldCheck, Bell, type LucideIcon } from "lucide-react";

export type NavItem = {
  id: "home" | "history" | "goals" | "categories" | "settings" | "incomes" | "recurring" | "debts" | "reports" | "security" | "admin" | "notifications";
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Inicio", href: "/", icon: Home },
  { id: "history", label: "Movimientos", href: "/movimientos", icon: ListOrdered },
  { id: "incomes", label: "Ingresos", href: "/ingresos", icon: TrendingUp },
  { id: "recurring", label: "Recurrentes", href: "/recurrentes", icon: Repeat },
  { id: "debts", label: "Deudas", href: "/deudas", icon: Scale },
  { id: "categories", label: "Categorías", href: "/categorias", icon: PieChart },
  { id: "goals", label: "Objetivos", href: "/objetivos", icon: Target },
  { id: "reports", label: "Reportes", href: "/reportes", icon: BarChart2 },
  { id: "notifications", label: "Notificaciones", href: "/notificaciones", icon: Bell },
  { id: "settings", label: "Ajustes", href: "/ajustes", icon: Settings },
  { id: "security", label: "Seguridad", href: "/seguridad", icon: Shield },
  { id: "admin", label: "Superadmin", href: "/admin", icon: ShieldCheck, adminOnly: true },
];
