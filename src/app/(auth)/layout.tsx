"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { BrandLogo } from "@/components/brand-logo";
import { DevSignature } from "@/components/dev-signature";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (user.emailVerifiedAt) {
      router.replace("/");
    } else {
      router.replace("/verify-email/pending");
    }
  }, [hydrated, user, router]);

  return (
    <div className="flex min-h-svh flex-col items-center px-4 py-10">
      <Link
        href="/login"
        aria-label="Ahorro — Inicio"
        className="vt-brand-hero mb-6 flex items-center"
      >
        <BrandLogo variant="wordmark" size={40} priority />
      </Link>
      <div className="w-full max-w-sm md:max-w-md">{children}</div>
      <DevSignature className="mt-8" size={14} />
    </div>
  );
}
