"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthSplash } from "@/components/auth-gate";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore, useHouseholdsResolved } from "@/stores/household";

/** Plan 1.3: the new onboarding. AuthGate sends users without `onboardedAt` here. */
export default function OnboardingPage() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const currentId = useHouseholdStore((s) => s.currentId);
  const householdsResolved = useHouseholdsResolved(user?.id);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  // The first expense goes to "Mi plata": wait until it is known.
  if (!hydrated || !user || !householdsResolved || !currentId) return <AuthSplash />;
  return <OnboardingFlow />;
}
