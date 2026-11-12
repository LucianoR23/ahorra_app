import {
  CalendarDays,
  ArrowLeftRight,
  Bell,
  ChartColumn,
  ChartLine,
  CreditCard,
  House,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  List,
  ListChecks,
  Repeat,
  ScrollText,
  Settings,
  ShoppingBag,
  Sparkles,
  Shield,
  ShieldCheck,
  Tag,
  Target,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// App navigation (plan 1.10a, design README §1): bottom nav on mobile,
// sidebar on desktop, everything else grouped in "Más".

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Only for members of a hogar, whichever space is open. */
  hogarOnly?: boolean;
  /** Only for users without a hogar. */
  soloOnly?: boolean;
};

export type NavGroup = { title: string; items: NavItem[] };

const home: NavItem = { id: "home", label: "Inicio", href: "/", icon: House };
const history: NavItem = { id: "history", label: "Movimientos", href: "/movimientos", icon: List };
const cards: NavItem = { id: "cards", label: "Tarjetas", href: "/tarjetas", icon: CreditCard };
const more: NavItem = { id: "more", label: "Más", href: "/mas", icon: LayoutGrid };
const goals: NavItem = { id: "goals", label: "Presupuestos y objetivos", href: "/objetivos", icon: Target };
const reports: NavItem = { id: "reports", label: "Reportes", href: "/reportes", icon: ChartColumn };
const hogar: NavItem = { id: "hogar", label: "Hogar", href: "/hogar", icon: Users, hogarOnly: true };

/** Mobile bottom nav, around the central "Cargar gasto" button. */
export const BOTTOM_NAV: { left: NavItem[]; right: NavItem[] } = {
  left: [home, history],
  right: [cards, more],
};

export const SIDEBAR_NAV: NavItem[] = [home, history, cards, goals, hogar, reports, more];

export const MORE_GROUPS: NavGroup[] = [
  {
    title: "Tu plata",
    items: [
      { id: "incomes", label: "Ingresos", href: "/ingresos", icon: TrendingUp },
      { id: "recurring", label: "Recurrentes", href: "/recurrentes", icon: Repeat },
      { id: "calendar", label: "Vencimientos", href: "/vencimientos", icon: CalendarDays },
      goals,
      { id: "simulate", label: "¿Me lo puedo comprar?", href: "/simular", icon: ShoppingBag },
      { id: "rates", label: "Cotizaciones", href: "/cotizaciones", icon: ChartLine },
      { id: "categories", label: "Categorías", href: "/categorias", icon: Tag },
      reports,
    ],
  },
  {
    title: "Hogar",
    items: [
      { ...hogar, label: "Hogar y miembros" },
      { id: "debts", label: "Cuentas entre ustedes", href: "/deudas", icon: ArrowLeftRight, hogarOnly: true },
      { id: "share", label: "Compartir gastos", href: "/hogar", icon: Users, soloOnly: true },
    ],
  },
  {
    title: "Cuenta",
    items: [
      { id: "notifications", label: "Notificaciones", href: "/notificaciones", icon: Bell },
      { id: "security", label: "Seguridad y privacidad", href: "/seguridad", icon: Shield },
      { id: "settings", label: "Ajustes", href: "/ajustes", icon: Settings },
      { id: "support", label: "Ayuda y soporte", href: "/soporte", icon: LifeBuoy },
      { id: "admin", label: "Superadmin", href: "/admin", icon: ShieldCheck, adminOnly: true },
    ],
  },
];

/** The superadmin area (plan 1.11): its own layout, apart from the app. */
export const ADMIN_NAV: NavItem[] = [
  { id: "admin-home", label: "Resumen", href: "/admin", icon: LayoutDashboard },
  { id: "admin-accounts", label: "Cuentas", href: "/admin/cuentas", icon: Users },
  { id: "admin-audit", label: "Auditoría", href: "/admin/auditoria", icon: ScrollText },
  { id: "admin-households", label: "Hogares", href: "/admin/hogares", icon: House },
  { id: "admin-waitlist", label: "Lista de espera", href: "/admin/lista-de-espera", icon: ListChecks },
  { id: "admin-ai", label: "IA", href: "/admin/ia", icon: Sparkles },
  { id: "admin-tools", label: "Herramientas", href: "/admin/herramientas", icon: Wrench },
];

/** Active admin section: "/admin" only lights up on itself. */
export function isAdminActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Routes with their own tab; any other screen lights up "Más". */
const TAB_ROUTES = ["/", "/movimientos", "/agregar", "/tarjetas"];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/mas") return !TAB_ROUTES.some((r) => isActive(pathname, r));
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function visibleFor(item: NavItem, ctx: { isAdmin: boolean; hasHogar: boolean }): boolean {
  if (item.adminOnly && !ctx.isAdmin) return false;
  if (item.hogarOnly && !ctx.hasHogar) return false;
  if (item.soloOnly && ctx.hasHogar) return false;
  return true;
}
