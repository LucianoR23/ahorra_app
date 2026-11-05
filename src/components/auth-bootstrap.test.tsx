import { render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { API, requests, server, signOut } from "@/test/msw";
import { AuthBootstrap } from "./auth-bootstrap";

const user = { id: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test" };

beforeEach(() => signOut());

// Next.js runs the app in React StrictMode in development, which mounts,
// unmounts and remounts every effect. Regression (found by the 0.21h E2E):
// the first run was cancelled by the simulated unmount and the second skipped
// by the "already bootstrapped" ref, so `hydrated` never became true and dev
// stayed on the loading screen after any reload or login.
describe.each([
  ["plain", (ui: React.ReactNode) => ui],
  ["StrictMode", (ui: React.ReactNode) => <StrictMode>{ui}</StrictMode>],
])("AuthBootstrap (%s)", (_mode, wrap) => {
  it("without a session: marks the app hydrated, logged out", async () => {
    server.use(http.post(`${API}/auth/refresh`, () => HttpResponse.json({ code: "unauthorized" }, { status: 401 })));
    render(wrap(<AuthBootstrap />));
    await waitFor(() => expect(useAuthStore.getState().hydrated).toBe(true));
    expect(useAuthStore.getState().user).toBeNull();
    expect(requests().filter((r) => r.path === "/auth/refresh")).toHaveLength(1); // one refresh, even in StrictMode
  });

  it("with a refresh cookie: restores the session and resolves the households", async () => {
    server.use(
      http.post(`${API}/auth/refresh`, () => HttpResponse.json({ accessToken: "tk", accessExpiresAt: "2099-01-01T00:00:00Z" })),
      http.get(`${API}/me`, () => HttpResponse.json(user)),
      http.get(`${API}/households`, () => HttpResponse.json([{ id: "h1", name: "Casa", baseCurrency: "ARS" }])),
    );
    render(wrap(<AuthBootstrap />));
    await waitFor(() => expect(useAuthStore.getState().hydrated).toBe(true));
    expect(useAuthStore.getState()).toMatchObject({ accessToken: "tk", user: { id: "u1" } });
    expect(useHouseholdStore.getState()).toMatchObject({ currentId: "h1", resolvedFor: "u1" });
  });
});
