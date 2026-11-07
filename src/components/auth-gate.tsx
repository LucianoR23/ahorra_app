"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore, useHouseholdsResolved } from "@/stores/household";
import { BrandLogo } from "@/components/brand-logo";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const currentHouseholdId = useHouseholdStore((s) => s.currentId);
  const householdsResolved = useHouseholdsResolved(user?.id);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // Decide only once the user's households are known; until then the
    // splash stays (no onboarding flash right after logging in).
    if (!householdsResolved) return;
    if (!currentHouseholdId && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [hydrated, user, householdsResolved, currentHouseholdId, pathname, router]);

  if (!hydrated || !user || !householdsResolved || !currentHouseholdId) {
    return <AuthSplash />;
  }
  return (
    <div
      key={user.id + ":" + currentHouseholdId}
      className="animate-in fade-in duration-300"
    >
      {children}
    </div>
  );
}

export function AuthSplash() {
  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary),transparent_60%)]/10"
      />
      <div className="relative flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-500">
        <span className="vt-brand-hero flex items-center">
          <BrandLogo variant="wordmark" size={40} priority />
        </span>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin text-primary" />
          Cargando
        </div>
      </div>
    </div>
  );
}
