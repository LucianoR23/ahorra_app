"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Plus, LayoutGrid, Bell, Settings2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthGate } from "@/components/auth-gate";
import { HouseholdSwitcher } from "@/components/household-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { DevSignature } from "@/components/dev-signature";
import { InsightsUnreadBadge } from "@/components/insights-inbox";
import { useAuthStore } from "@/stores/auth";
import { logout as apiLogout } from "@/lib/api/auth";
import { unsubscribePush } from "@/lib/push";
import { useHouseholdStore } from "@/stores/household";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_ORDER_MOBILE = ["home", "history", "add", "goals", "more"] as const;
const CONFIG_IDS = new Set(["reports", "settings", "security", "support", "admin"]);

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShellInner>{children}</AppShellInner>
    </AuthGate>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);
  const setHouseholdId = useHouseholdStore((s) => s.setCurrentId);

  const [moreOpen, setMoreOpen] = useState(false);
  const configActive =
    pathname.startsWith("/reportes") ||
    pathname.startsWith("/ajustes") ||
    pathname.startsWith("/seguridad") ||
    pathname.startsWith("/soporte") ||
    pathname.startsWith("/admin");
  const [configOpen, setConfigOpen] = useState(configActive);
  const popupRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartTime = useRef(0);
  const dragDelta = useRef(0);

  function resetDragStyles() {
    [popupRef.current, overlayRef.current].forEach((el) => {
      if (!el) return;
      el.style.transition = "";
      el.style.transform = "";
      el.style.opacity = "";
    });
  }

  function onDragStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    dragDelta.current = 0;
    popupRef.current = document.querySelector<HTMLElement>(
      '[data-slot="sheet-content"]',
    );
    overlayRef.current = document.querySelector<HTMLElement>(
      '[data-slot="sheet-overlay"]',
    );
    if (popupRef.current) popupRef.current.style.transition = "none";
    if (overlayRef.current) overlayRef.current.style.transition = "none";
  }

  function onDragMove(e: React.TouchEvent) {
    if (dragStartY.current === null || !popupRef.current) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    const applied = delta > 0 ? delta : Math.max(delta / 3, -24);
    dragDelta.current = applied;
    popupRef.current.style.transform = `translateY(${applied}px)`;
    if (overlayRef.current && applied > 0) {
      const h = popupRef.current.offsetHeight || 1;
      const progress = Math.min(applied / h, 1);
      overlayRef.current.style.opacity = String(1 - progress);
    }
  }

  function onDragEnd() {
    if (dragStartY.current === null || !popupRef.current) return;
    const delta = dragDelta.current;
    const elapsed = Date.now() - dragStartTime.current;
    const velocity = delta / Math.max(elapsed, 1);
    dragStartY.current = null;
    dragDelta.current = 0;

    const popup = popupRef.current;
    const ov = overlayRef.current;

    if (delta > 100 || velocity > 0.6) {
      popup.style.transition = "transform 200ms ease-out, opacity 200ms ease-out";
      popup.style.transform = "translateY(100%)";
      if (ov) {
        ov.style.transition = "opacity 200ms ease-out";
        ov.style.opacity = "0";
      }
      setTimeout(() => {
        setMoreOpen(false);
        setTimeout(resetDragStyles, 50);
      }, 200);
    } else {
      popup.style.transition = "transform 180ms ease-out";
      popup.style.transform = "translateY(0px)";
      if (ov) {
        ov.style.transition = "opacity 180ms ease-out";
        ov.style.opacity = "1";
      }
      setTimeout(resetDragStyles, 200);
    }
  }

  async function handleLogout() {
    const token = useAuthStore.getState().accessToken;
    if (token) await unsubscribePush(token).catch(() => {});
    try {
      await apiLogout();
    } finally {
      clearAuth();
      setHouseholdId(null);
      router.replace("/login");
    }
  }

  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "··";
  const displayName = user?.firstName ?? "—";
  const visibleNavItems = NAV_ITEMS.filter((n) => !n.adminOnly || user?.isSuperadmin);

  return (
    <div className="flex min-h-svh">
      {/* Sidebar (md+) */}
      <aside className="hidden md:flex sticky top-0 h-svh w-64 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-3">
        <Link
          href="/"
          aria-label="Ahorro — Inicio"
          className="vt-brand-hero flex items-center px-2 pb-3"
        >
          <BrandLogo variant="wordmark" size={30} priority />
        </Link>

        <div className="px-1 pb-2">
          <HouseholdSwitcher />
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">
          {visibleNavItems.filter((n) => !CONFIG_IDS.has(n.id)).map((n) => {
            const active = isActive(pathname, n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.id}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4.5", active && "text-primary")} />
                <span className="flex-1">{n.label}</span>
                {n.id === "notifications" && <InsightsUnreadBadge />}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setConfigOpen((v) => !v)}
            aria-expanded={configOpen}
            className={cn(
              "mt-0.5 flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
              configActive
                ? "text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Settings2 className={cn("size-4.5", configActive && "text-primary")} />
            <span className="flex-1 text-left">Configuración</span>
            <ChevronDown
              className={cn("size-4 transition-transform", configOpen && "rotate-180")}
            />
          </button>

          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
              configOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-0.5 pl-3 pt-0.5">
                {visibleNavItems.filter((n) => CONFIG_IDS.has(n.id)).map((n) => {
                  const active = isActive(pathname, n.href);
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      tabIndex={configOpen ? 0 : -1}
                      className={cn(
                        "flex items-center gap-3 rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("size-4", active && "text-primary")} />
                      <span className="flex-1">{n.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        <div className="mt-3 flex flex-col gap-2">
          <Link
            href="/agregar"
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-card transition-colors hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            Agregar gasto
          </Link>

          <div className="flex items-center gap-2.5 rounded-xl bg-secondary p-3">
            <Link
              href="/ajustes"
              aria-label="Ir a ajustes"
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
            >
              <div className="grid size-8 place-items-center rounded-[10px] bg-linear-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{displayName}</div>
                <div className="truncate text-[10px] text-muted-foreground">{user?.email}</div>
              </div>
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>

          <DevSignature className="pt-1" size={12} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 min-w-0 flex-col">
        <header className="md:hidden sticky top-0 z-40 flex items-center gap-3 border-b border-border/60 bg-background/85 px-4 py-2 backdrop-blur-xl safe-top">
          <Link href="/" aria-label="Ahorro — Inicio" className="shrink-0">
            <BrandLogo variant="icon" size={28} priority className="size-7" />
          </Link>
          <div className="min-w-0 flex-1">
            <HouseholdSwitcher />
          </div>
          <Link
            href="/notificaciones"
            aria-label="Notificaciones"
            className="relative grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="size-4.5" />
            <span className="absolute right-0.5 top-0.5">
              <InsightsUnreadBadge dotOnly />
            </span>
          </Link>
        </header>
        <main className="flex-1 overflow-x-hidden pb-24 md:pb-8">
          <div
            key={pathname}
            className="mx-auto w-full max-w-3xl md:max-w-5xl px-4 pt-4 md:px-10 md:pt-8 animate-in fade-in slide-in-from-bottom-1 duration-200"
          >
            {children}
          </div>
        </main>

        {/* Bottom nav (mobile) */}
        <nav
          aria-label="Navegación principal"
          className="fixed inset-x-3 bottom-3 z-50 flex h-17 items-center justify-around rounded-3xl border border-border bg-card/85 p-1.5 shadow-card backdrop-blur-xl md:hidden safe-bottom"
        >
          {NAV_ORDER_MOBILE.map((id) => {
            if (id === "add") {
              return (
                <button
                  key="add"
                  onClick={() => router.push("/agregar")}
                  aria-label="Agregar gasto"
                  className="grid size-13.5 -translate-y-2 cursor-pointer place-items-center rounded-[18px] bg-linear-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/40 transition-transform active:scale-95"
                >
                  <Plus className="size-5.5" strokeWidth={2.5} />
                </button>
              );
            }
            if (id === "more") {
              const moreActive = !["/", "/movimientos", "/agregar", "/objetivos"].some((h) =>
                h === "/" ? pathname === "/" : pathname.startsWith(h),
              );
              return (
                <Sheet key="more" open={moreOpen} onOpenChange={setMoreOpen}>
                  <SheetTrigger
                    render={
                      <button
                        type="button"
                        aria-label="Más opciones"
                        className={cn(
                          "flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 transition-colors",
                          moreActive ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                    }
                  >
                    <LayoutGrid className="size-5" />
                    <span className="text-[10px] font-semibold">Más</span>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    showCloseButton={false}
                    className="rounded-t-3xl border-border pb-[calc(env(safe-area-inset-bottom)+1rem)]"
                  >
                    <div className="flex flex-col">
                      <div
                        onTouchStart={onDragStart}
                        onTouchMove={onDragMove}
                        onTouchEnd={onDragEnd}
                        onTouchCancel={onDragEnd}
                        className="touch-none cursor-grab active:cursor-grabbing"
                      >
                        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
                        <SheetHeader className="pb-2 pt-3">
                          <SheetTitle className="text-base font-bold">Menú</SheetTitle>
                        </SheetHeader>
                      </div>
                      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                      {visibleNavItems.map((n) => {
                        const active = isActive(pathname, n.href);
                        const Icon = n.icon;
                        return (
                          <SheetClose
                            key={n.id}
                            nativeButton={false}
                            render={
                              <Link
                                href={n.href}
                                className={cn(
                                  "flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card/60 px-2 py-4 text-center transition-colors active:scale-[0.97]",
                                  active && "border-primary/40 bg-primary/10",
                                )}
                              />
                            }
                          >
                            <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-[11px] font-semibold">{n.label}</span>
                          </SheetClose>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="grid size-9 place-items-center rounded-[10px] bg-linear-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold">{displayName}</div>
                          <div className="truncate text-[10px] text-muted-foreground">{user?.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ThemeToggle />
                        <SheetClose
                          render={
                            <button
                              type="button"
                              onClick={handleLogout}
                              aria-label="Cerrar sesión"
                              className="grid size-9 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            />
                          }
                        >
                          <LogOut className="size-4" />
                        </SheetClose>
                      </div>
                    </div>
                      <DevSignature className="pb-2 pt-3" />
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }
            const item = NAV_ITEMS.find((n) => n.id === id)!;
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
