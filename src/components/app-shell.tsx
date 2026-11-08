"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV, SIDEBAR_NAV, isActive, visibleFor, type NavItem } from "@/lib/nav";
import { AuthGate } from "@/components/auth-gate";
import { SpaceTabs } from "@/components/space-tabs";
import { useSpaces } from "@/lib/spaces";
import { BrandLogo } from "@/components/brand-logo";
import { DevSignature } from "@/components/dev-signature";
import { InsightsUnreadBadge } from "@/components/insights-inbox";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/stores/auth";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";

// App shell (plan 1.10a, design README §1 and `DesktopInicio`): bottom nav
// on mobile, sidebar from md up. Content is capped at 1120 px.

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShellInner>{children}</AppShellInner>
    </AuthGate>
  );
}

function NotificationsLink({ className }: { className?: string }) {
  return (
    <Link
      href="/notificaciones"
      aria-label="Notificaciones"
      className={cn(
        "relative grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        className,
      )}
    >
      <Bell aria-hidden className="size-6" strokeWidth={1.75} />
      <span className="absolute right-2 top-2">
        <InsightsUnreadBadge dotOnly />
      </span>
    </Link>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { hogar } = useSpaces();
  const ctx = { isAdmin: Boolean(user?.isSuperadmin), hasHogar: Boolean(hogar) };
  const sidebarItems = SIDEBAR_NAV.filter((n) => visibleFor(n, ctx));

  return (
    <div className="flex min-h-svh">
      {/* Sidebar (md+) */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
        <Link href="/" aria-label={`${brand.name}, inicio`} className="vt-brand-hero mb-6 flex items-center px-2">
          <BrandLogo variant="wordmark" size={30} priority />
        </Link>

        <Link href="/agregar" className={cn(buttonVariants(), "mb-6 w-full")}>
          <Plus aria-hidden strokeWidth={2} />
          Cargar gasto
        </Link>

        <nav aria-label="Navegación principal" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {sidebarItems.map((n) => {
            const active = isActive(pathname, n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.id}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-body transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                  active ? "bg-surface-2 font-semibold text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="flex-1">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 flex flex-col gap-3">
          <Link
            href="/ajustes"
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <UserAvatar className="size-9" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-caption font-semibold text-ink">
                {user ? `${user.firstName} ${user.lastName}` : "Tu cuenta"}
              </span>
              <span className="block truncate text-xs text-ink-muted">Perfil y cuenta</span>
            </span>
          </Link>
          <DevSignature size={12} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top sticky top-0 z-40 flex items-center gap-3 bg-background/90 px-4 py-2 backdrop-blur-xl md:static md:mx-auto md:w-full md:max-w-[1120px] md:justify-end md:bg-transparent md:px-10 md:pt-6 md:backdrop-blur-none">
          <div className="min-w-0 flex-1 md:max-w-56 md:flex-none">
            <SpaceTabs />
          </div>
          <NotificationsLink />
        </header>
        <main className="flex-1 overflow-x-hidden pb-28 md:pb-10">
          <div
            key={pathname}
            className="mx-auto w-full max-w-[1120px] px-4 pt-2 animate-in fade-in slide-in-from-bottom-1 duration-(--duration-base) motion-reduce:animate-none md:px-10 md:pt-2"
          >
            {children}
          </div>
        </main>

        <BottomNav pathname={pathname} />
      </div>
    </div>
  );
}

function BottomNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-xs outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        active ? "font-semibold text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      <Icon aria-hidden className="size-6" strokeWidth={1.75} />
      {item.label}
    </Link>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface md:hidden"
    >
      <div className="mx-auto flex h-18 max-w-lg items-center px-2">
        {BOTTOM_NAV.left.map((n) => (
          <BottomNavLink key={n.id} item={n} pathname={pathname} />
        ))}
        <div className="flex flex-1 justify-center">
          <Link
            href="/agregar"
            aria-label="Cargar gasto"
            className="grid size-14 -translate-y-3 place-items-center rounded-full bg-brand text-on-brand shadow-card transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Plus aria-hidden className="size-7" strokeWidth={2} />
          </Link>
        </div>
        {BOTTOM_NAV.right.map((n) => (
          <BottomNavLink key={n.id} item={n} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
