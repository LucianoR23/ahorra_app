"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import NotFound from "@/app/not-found";
import { AuthGate } from "@/components/auth-gate";
import { BrandLogo } from "@/components/brand-logo";
import { brand } from "@/config/brand";
import { ADMIN_NAV, isAdminActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

// Superadmin area (plan 1.11): its own layout, apart from the app, so the
// superadmin also uses the app as anyone else. Sidebar from md up, a row of
// tabs on phones. Anyone else gets the regular 404: the area doesn't exist
// for them.

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AdminShellInner>{children}</AdminShellInner>
    </AuthGate>
  );
}

const linkFocus = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function BackToApp({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg px-3 text-body text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink",
        linkFocus,
        className,
      )}
    >
      <ArrowLeft aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
      Volver a la app
    </Link>
  );
}

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  if (!user?.isSuperadmin) return <NotFound />;

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
        <div className="mb-6 flex flex-col gap-2 px-2">
          <BrandLogo variant="wordmark" size={30} priority />
          <span className="flex items-center gap-1.5 text-caption font-semibold text-ink-muted">
            <ShieldCheck aria-hidden className="size-4" strokeWidth={1.75} />
            Superadmin
          </span>
        </div>
        <nav aria-label="Superadmin" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {ADMIN_NAV.map((n) => {
            const active = isAdminActive(pathname, n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.id}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-body transition-colors",
                  linkFocus,
                  active ? "bg-surface-2 font-semibold text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <BackToApp className="mt-4" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-body font-semibold text-ink">
              <ShieldCheck aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{brand.name} · Superadmin</span>
            </span>
            <BackToApp className="-mr-3" />
          </div>
          <nav aria-label="Superadmin" className="flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {ADMIN_NAV.map((n) => {
              const active = isAdminActive(pathname, n.href);
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-9 shrink-0 items-center rounded-full px-3 text-caption transition-colors",
                    linkFocus,
                    active ? "bg-primary font-semibold text-primary-foreground" : "bg-surface-2 text-ink-muted hover:text-ink",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="flex-1 overflow-x-hidden pb-10">
          <div
            key={pathname}
            className="mx-auto w-full max-w-[1120px] px-4 pt-4 animate-in fade-in slide-in-from-bottom-1 duration-(--duration-base) motion-reduce:animate-none md:px-10 md:pt-8"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
