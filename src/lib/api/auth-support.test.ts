import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { API, lastRequest, server, signIn } from "@/test/msw";
import * as auth from "./auth";
import * as support from "./support";

const user = { id: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test" };
const session = { user, accessToken: "tk", accessExpiresAt: "2099-01-01T00:00:00Z" };

describe("auth API", () => {
  it("login, register and Google parse the session and default isSuperadmin", async () => {
    server.use(
      http.post(`${API}/auth/login`, () => HttpResponse.json(session)),
      http.post(`${API}/auth/register`, () => HttpResponse.json(session, { status: 201 })),
      http.post(`${API}/auth/google`, () => HttpResponse.json({ ...session, isNewUser: true })),
    );
    await expect(auth.login({ email: "ana@example.test", password: "x" } as never)).resolves.toMatchObject({
      accessToken: "tk", user: { isSuperadmin: false },
    });
    await auth.register({ email: "ana@example.test" } as never);
    expect(lastRequest().path).toBe("/auth/register");
    await expect(auth.loginWithGoogle("id-token")).resolves.toMatchObject({ isNewUser: true });
  });

  it("rejects a response that does not match the schema", async () => {
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json({ user: { id: "u1" } })));
    await expect(auth.login({ email: "a", password: "b" } as never)).rejects.toThrow();
  });

  it("refresh, logout and me", async () => {
    server.use(
      http.post(`${API}/auth/refresh`, () => HttpResponse.json({ accessToken: "t2", accessExpiresAt: "2099-01-01T00:00:00Z" })),
      http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API}/me`, () => HttpResponse.json(user)),
    );
    await expect(auth.refresh()).resolves.toEqual({ accessToken: "t2", accessExpiresAt: "2099-01-01T00:00:00Z" });
    await expect(auth.logout()).resolves.toBeUndefined();
    await expect(auth.getMe("tk")).resolves.toMatchObject({ id: "u1" });
    expect(lastRequest().headers.get("authorization")).toBe("Bearer tk");
  });

  it.each([
    ["forgotPassword", () => auth.forgotPassword("a@b.c"), "/auth/forgot-password", { email: "a@b.c" }, false],
    ["resetPassword", () => auth.resetPassword("tok", "Nueva-123"), "/auth/reset-password", { token: "tok", newPassword: "Nueva-123" }, false],
    ["changePassword", () => auth.changePassword("tk", "Vieja-1", "Nueva-1"), "/auth/change-password", { currentPassword: "Vieja-1", newPassword: "Nueva-1" }, true],
    ["verifyEmail", () => auth.verifyEmail("tok"), "/auth/verify-email", { token: "tok" }, false],
    ["resendVerificationEmail", () => auth.resendVerificationEmail("tk"), "/auth/resend-verification-email", undefined, true],
  ] as const)("%s posts to %s", async (_n, call, path, body, authed) => {
    server.use(http.post(`${API}${path}`, () => new HttpResponse(null, { status: 204 })));
    await call();
    const r = lastRequest();
    expect(r.path).toBe(path);
    expect(r.headers.get("authorization")).toBe(authed ? "Bearer tk" : null);
    if (body) await expect.poll(() => (r.body ? JSON.parse(r.body) : null)).toEqual(body);
  });
});

describe("support API", () => {
  beforeEach(() => {
    signIn({ token: "tk", householdId: "h1" });
    server.use(http.all(`${API}/support/*`, () => HttpResponse.json({})));
  });

  it("lists, reads and replies", async () => {
    await support.getMyTickets();
    expect(lastRequest()).toMatchObject({ path: "/support/tickets/mine", query: { limit: "20" } });
    await support.getMyTickets({ cursor: "c1", limit: 5 });
    expect(lastRequest().query).toEqual({ cursor: "c1", limit: "5" });
    await support.getTicket("t1");
    expect(lastRequest().path).toBe("/support/tickets/t1");
    await support.addTicketMessage("t1", "hola");
    expect(lastRequest()).toMatchObject({ method: "POST", path: "/support/tickets/t1/messages" });
  });
});
