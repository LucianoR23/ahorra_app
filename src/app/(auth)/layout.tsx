"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { safeNext } from "@/lib/safe-next";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (user.emailVerifiedAt) {
      // Read here, not with useSearchParams: a layout would need a Suspense boundary.
      router.replace(safeNext(window.location.search));
    } else {
      router.replace("/verify-email/pending");
    }
  }, [hydrated, user, router]);

  return <AuthShell>{children}</AuthShell>;
}
