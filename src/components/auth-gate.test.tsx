import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "@/components/auth-gate";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import type { User } from "@/lib/api/schemas";

const replace = vi.fn();
let pathname = "/";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => pathname,
}));
vi.mock("@/components/brand-logo", () => ({ BrandLogo: () => <span>logo</span> }));

const user = { id: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test" } as User;

beforeEach(() => {
  replace.mockClear();
  pathname = "/";
  useAuthStore.setState({ user: null, accessToken: null, accessExpiresAt: null, hydrated: false });
  useHouseholdStore.setState({ currentId: null, resolvedFor: null });
});

function renderGate() {
  return render(
    <AuthGate>
      <p>app content</p>
    </AuthGate>,
  );
}

describe("AuthGate", () => {
  it("sends a logged-out visitor to /login once the session check ends", () => {
    useAuthStore.setState({ hydrated: true });
    renderGate();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("waits on the loading screen while the user's households are still loading", () => {
    // Just logged in with the form: user known, households not fetched yet.
    useAuthStore.setState({ hydrated: true, user, accessToken: "t" });
    renderGate();

    expect(replace).not.toHaveBeenCalledWith("/onboarding");
    expect(screen.getByText("Cargando")).toBeInTheDocument();
    expect(screen.queryByText("app content")).not.toBeInTheDocument();
  });

  it("goes to /onboarding only after the households resolve to none", () => {
    useAuthStore.setState({ hydrated: true, user, accessToken: "t" });
    renderGate();
    act(() => useHouseholdStore.getState().markResolved(user.id));

    expect(replace).toHaveBeenCalledWith("/onboarding");
  });

  it("shows the app once a household resolves", () => {
    useAuthStore.setState({ hydrated: true, user, accessToken: "t" });
    renderGate();
    act(() => {
      useHouseholdStore.getState().setCurrentId("h1");
      useHouseholdStore.getState().markResolved(user.id);
    });

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("app content")).toBeInTheDocument();
  });

  it("does not trust a household resolved for a previous user", () => {
    useHouseholdStore.setState({ currentId: "h-old" });
    useHouseholdStore.getState().markResolved("someone-else");
    useAuthStore.setState({ hydrated: true, user, accessToken: "t" });
    renderGate();

    expect(screen.queryByText("app content")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
