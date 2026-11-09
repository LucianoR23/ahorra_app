import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirm } from "@/lib/confirm";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { SignOutEverywhereItem } from "./sign-out-everywhere-card";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/push", () => ({ unsubscribePush: vi.fn().mockResolvedValue(undefined) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
// The dialog itself is covered in ui-helpers.test.tsx; here only the card's logic.
vi.mock("@/lib/confirm", () => ({ confirm: vi.fn() }));

const renderCard = () => render(<SignOutEverywhereItem />);

beforeEach(() => {
  signIn({ token: "tk" });
  resetRequests();
  replace.mockClear();
  vi.mocked(confirm).mockClear();
});

describe("SignOutEverywhereItem", () => {
  it("after confirming, ends every session and signs out here", async () => {
    server.use(http.post(`${API}/auth/logout-all`, () => new HttpResponse(null, { status: 204 })));
    vi.mocked(confirm).mockResolvedValue(true);
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión en todos los dispositivos" }));
    expect(vi.mocked(confirm).mock.calls[0][0]).toMatchObject({ confirmLabel: "Cerrar todas", destructive: true });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    const call = requests().find((r) => r.path === "/auth/logout-all");
    expect(call?.method).toBe("POST");
    expect(call?.headers.get("authorization")).toBe("Bearer tk");
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useHouseholdStore.getState().currentId).toBeNull();
  });

  it("does nothing when the confirmation is cancelled", async () => {
    vi.mocked(confirm).mockResolvedValue(false);
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión en todos los dispositivos" }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(requests().some((r) => r.path === "/auth/logout-all")).toBe(false);
    expect(useAuthStore.getState().accessToken).toBe("tk");
  });
});
