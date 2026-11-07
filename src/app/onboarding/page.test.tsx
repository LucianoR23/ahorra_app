import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "@/app/onboarding/page";
import { API, server } from "@/test/msw";
import { hogarSpace, personalSpace, WithSWR } from "@/test/spaces";
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

  it("shows the optional form when the user only has Mi plata", async () => {
    server.use(http.get(`${API}/households`, () => HttpResponse.json([personalSpace])));
    render(<OnboardingPage />, { wrapper: WithSWR });
    act(() => {
      useHouseholdStore.getState().setCurrentId(personalSpace.id);
      useHouseholdStore.getState().markResolved(user.id);
    });
    expect(await screen.findByRole("heading", { name: "Creá tu hogar" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Ahora no" }));
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("sends a user who already has a hogar home without showing the form", async () => {
    server.use(http.get(`${API}/households`, () => HttpResponse.json([personalSpace, hogarSpace])));
    render(<OnboardingPage />, { wrapper: WithSWR });
    act(() => {
      useHouseholdStore.getState().setCurrentId(personalSpace.id);
      useHouseholdStore.getState().markResolved(user.id);
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("heading", { name: "Creá tu hogar" })).not.toBeInTheDocument();
  });
});
