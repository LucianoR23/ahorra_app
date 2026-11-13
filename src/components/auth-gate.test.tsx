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
const onboarded = { ...user, onboardedAt: "2026-11-08T12:00:00Z" } as User;

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

  it("comes back to the page after signing in (a shared photo waits there, plan 3.4)", () => {
    pathname = "/agregar";
    window.history.replaceState(null, "", "/agregar?recibido=1");
    useAuthStore.setState({ hydrated: true });
    renderGate();
    expect(replace).toHaveBeenCalledWith("/login?next=%2Fagregar%3Frecibido%3D1");
    window.history.replaceState(null, "", "/");
  });

  it("waits on the loading screen while the user's households are still loading", () => {
    // Just logged in with the form: user known, households not fetched yet.
    useAuthStore.setState({ hydrated: true, user, accessToken: "t" });
    renderGate();

    expect(replace).not.toHaveBeenCalledWith("/onboarding");
    expect(screen.getByText("Cargando")).toBeInTheDocument();
    expect(screen.queryByText("app content")).not.toBeInTheDocument();
  });

  it("sends a user who has not onboarded to /onboarding once the households resolve", () => {
    useAuthStore.setState({ hydrated: true, user, accessToken: "t" });
    renderGate();
    act(() => {
      useHouseholdStore.getState().setCurrentId("h1");
      useHouseholdStore.getState().markResolved(user.id);
    });

    expect(replace).toHaveBeenCalledWith("/onboarding");
    expect(screen.queryByText("app content")).not.toBeInTheDocument();
  });

  it("does not loop while already on /onboarding", () => {
    pathname = "/onboarding";
    useAuthStore.setState({ hydrated: true, user, accessToken: "t" });
    renderGate();
    act(() => useHouseholdStore.getState().markResolved(user.id));

    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the app once a household resolves for an onboarded user", () => {
    useAuthStore.setState({ hydrated: true, user: onboarded, accessToken: "t" });
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
