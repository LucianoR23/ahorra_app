import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "@/app/onboarding/page";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import type { User } from "@/lib/api/schemas";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/onboarding",
}));
vi.mock("@/components/brand-logo", () => ({ BrandLogo: () => <span>logo</span> }));

const user = { id: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test" } as User;

beforeEach(() => {
  replace.mockClear();
  useAuthStore.setState({ hydrated: true, user, accessToken: "t", accessExpiresAt: null });
  useHouseholdStore.setState({ currentId: null, resolvedFor: null });
});

describe("OnboardingPage", () => {
  it("shows the loading screen, not the form, while households are loading", () => {
    render(<OnboardingPage />);
    expect(screen.getByText("Cargando")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /crear/i })).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the form when the user has no household", () => {
    render(<OnboardingPage />);
    act(() => useHouseholdStore.getState().markResolved(user.id));
    expect(screen.getByRole("heading", { name: "Creá tu hogar" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("sends a user who already has a household home without showing the form", () => {
    render(<OnboardingPage />);
    act(() => {
      useHouseholdStore.getState().setCurrentId("h1");
      useHouseholdStore.getState().markResolved(user.id);
    });
    expect(replace).toHaveBeenCalledWith("/");
    expect(screen.getByText("Cargando")).toBeInTheDocument();
  });
});
