import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { API, lastRequest, server } from "@/test/msw";
import { API_URL, apiFetch } from "./client";
import { ApiError } from "./errors";

describe("apiFetch", () => {
  it("talks to the configured API origin", () => {
    expect(API_URL).toBe(API);
  });

  it("builds the URL, drops empty query values and sends the session headers", async () => {
    server.use(http.get(`${API}/expenses`, () => HttpResponse.json({ items: [] })));

    const out = await apiFetch({
      path: "/expenses",
      token: "tk",
      householdId: "h1",
      query: { limit: 10, q: "", from: undefined, to: null, shared: false },
    });

    expect(out).toEqual({ items: [] });
    const r = lastRequest();
    expect(r.method).toBe("GET");
    expect(r.query).toEqual({ limit: "10", shared: "false" });
    expect(r.headers.get("authorization")).toBe("Bearer tk");
    expect(r.headers.get("x-household-id")).toBe("h1");
    expect(r.headers.get("accept")).toBe("application/json");
    expect(r.headers.get("content-type")).toBeNull(); // no body, no content type
  });

  it("always sends cookies and skips the HTTP cache", async () => {
    // Node's Request does not keep `credentials`, so check what fetch receives.
    server.use(http.get(`${API}/me`, () => HttpResponse.json({})));
    const spy = vi.spyOn(globalThis, "fetch");
    await apiFetch({ path: "/me" });
    expect(spy.mock.calls[0][1]).toMatchObject({ credentials: "include", cache: "no-store" });
  });

  it("sends JSON bodies and omits auth headers when there is no session", async () => {
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json({ ok: true })));

    await apiFetch({ method: "POST", path: "/auth/login", body: { email: "a@b.c" } });

    const r = lastRequest();
    expect(r.headers.get("content-type")).toBe("application/json");
    expect(r.body).toBe('{"email":"a@b.c"}');
    expect(r.headers.get("authorization")).toBeNull();
    expect(r.headers.get("x-household-id")).toBeNull();
  });

  it("lets the browser set the multipart boundary for FormData", async () => {
    let received: FormData | undefined;
    server.use(
      http.post(`${API}/support/tickets`, async ({ request }) => {
        received = await request.formData();
        return HttpResponse.json({ id: "t1" });
      }),
    );
    const form = new FormData();
    form.set("subject", "No anda");

    await apiFetch({ method: "POST", path: "/support/tickets", body: form });

    expect(lastRequest().headers.get("content-type")).toMatch(/^multipart\/form-data; boundary=/);
    expect(received?.get("subject")).toBe("No anda");
  });

  it("accepts absolute URLs as path", async () => {
    server.use(http.get("http://elsewhere.test/x", () => HttpResponse.json(1)));
    await expect(apiFetch({ path: "http://elsewhere.test/x" })).resolves.toBe(1);
  });

  it("returns undefined on 204 and null on an empty or non-JSON body", async () => {
    server.use(
      http.delete(`${API}/a`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API}/b`, () => new HttpResponse("", { status: 200 })),
      http.get(`${API}/c`, () => new HttpResponse("<html>", { status: 200 })),
    );
    await expect(apiFetch({ method: "DELETE", path: "/a" })).resolves.toBeUndefined();
    await expect(apiFetch({ path: "/b" })).resolves.toBeNull();
    await expect(apiFetch({ path: "/c" })).resolves.toBeNull();
  });

  it("turns error bodies into ApiError with code, message and field", async () => {
    server.use(
      http.post(`${API}/expenses`, () =>
        HttpResponse.json({ code: "validation", message: "debe ser > 0", field: "amount" }, { status: 422 }),
      ),
    );
    const err = await apiFetch({ method: "POST", path: "/expenses", body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: "validation", status: 422, field: "amount", message: "debe ser > 0" });
  });

  it("falls back to the status when the error has no body", async () => {
    server.use(http.get(`${API}/x`, () => new HttpResponse(null, { status: 404 })));
    const err = await apiFetch({ path: "/x" }).catch((e) => e);
    expect(err).toMatchObject({ code: "not_found", status: 404, message: "No encontrado" });
  });

  it("reads Retry-After in seconds or as an HTTP date on 429", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({}, { status: 429, headers: { "Retry-After": "30" } }),
      ),
    );
    const seconds = await apiFetch({ method: "POST", path: "/auth/login", body: {} }).catch((e) => e);
    expect(seconds).toMatchObject({ code: "rate_limited", retryAfterSeconds: 30, message: "Demasiados intentos. Reintentá en 30s." });

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({}, { status: 429, headers: { "Retry-After": "Sun, 01 Mar 2026 12:01:00 GMT" } }),
      ),
    );
    const date = (await apiFetch({ method: "POST", path: "/auth/login", body: {} }).catch((e) => e)) as ApiError;
    vi.useRealTimers();
    expect(date.retryAfterSeconds).toBe(60);
  });

  it("ignores a missing or unusable Retry-After", async () => {
    server.use(http.get(`${API}/x`, () => HttpResponse.json({}, { status: 429, headers: { "Retry-After": "soon" } })));
    const err = (await apiFetch({ path: "/x" }).catch((e) => e)) as ApiError;
    expect(err.retryAfterSeconds).toBeUndefined();
    expect(err.message).toBe("Demasiados intentos. Esperá unos minutos e intentá de nuevo.");
  });

  it("fails a request that no handler mocks (nothing reaches the network)", async () => {
    const err = await apiFetch({ path: "/not-mocked" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: "network" });
  });

  it("maps a network failure to a network ApiError", async () => {
    server.use(http.get(`${API}/x`, () => HttpResponse.error()));
    const err = await apiFetch({ path: "/x" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: "network", status: 0 });
  });
});

describe("ApiError.fromResponse", () => {
  it.each([
    [401, "unauthorized", "Sesión expirada"],
    [403, "forbidden", "No tenés permisos"],
    [404, "not_found", "No encontrado"],
    [409, "conflict", "Conflicto con el estado actual"],
    [413, "file_too_large", "Alguno de los archivos supera el límite (5 MB imágenes, 20 MB video)."],
    [415, "unsupported_format", "Solo se aceptan PNG, JPG, WebP y MP4."],
    [422, "validation", "Datos inválidos"],
    [500, "internal", "Error interno"],
    [418, "internal", "Error interno"],
  ])("status %i → %s", (status, code, message) => {
    expect(ApiError.fromResponse(status, null)).toMatchObject({ status, code, message });
  });

  it("prefers the body's code and message", () => {
    expect(ApiError.fromResponse(400, { code: "conflict", message: "ya existe" })).toMatchObject({ code: "conflict", message: "ya existe" });
  });

  it("network errors have their own default message", () => {
    expect(ApiError.network()).toMatchObject({ code: "network", status: 0, message: "Sin conexión con el servidor", name: "ApiError" });
  });
});
