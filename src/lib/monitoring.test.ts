import type { ErrorEvent } from "@sentry/browser";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn() }));
vi.mock("@sentry/browser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@sentry/browser")>()),
  init: sentry.init,
  captureException: sentry.captureException,
}));

import { beforeSend, captureError, initMonitoring, scrub } from "./monitoring";

describe("scrub", () => {
  it.each([
    ["", ""],
    ["Cannot read properties of undefined (reading 'map')", "Cannot read properties of undefined (reading 'map')"],
    ["no user ana.perez+x@example.com.ar", "no user [email]"],
    ["household 3f2b8c1e-9a4d-4c7e-8f00-1b2c3d4e5f60 gone", "household [id] gone"],
    ["monto 1.234,56 excede 300", "monto [n] excede [n]"],
    ["bad eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig", "bad [token]"],
    ["key 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08", "key [token]"],
    ["an_identifier_without_digits_that_is_long", "an_identifier_without_digits_that_is_long"],
    ['Unexpected token in "cena con Ana"', 'Unexpected token in "[redacted]"'],
  ])("%j", (input, want) => {
    expect(scrub(input)).toBe(want);
  });

  it("passes undefined through", () => {
    expect(scrub(undefined)).toBeUndefined();
  });
});

describe("beforeSend", () => {
  function event(): ErrorEvent {
    return {
      type: undefined,
      message: "falló para ana@example.com",
      transaction: "/movimientos/3f2b8c1e-9a4d-4c7e-8f00-1b2c3d4e5f60",
      user: { email: "ana@example.com", id: "1" },
      extra: { amount: 1234.56 },
      breadcrumbs: [{ message: "click Cena con Ana $ 1234" }],
      tags: { page: "/x/42", flag: true },
      contexts: { os: { name: "Android" }, custom: { amount: 5 } },
      request: {
        url: "https://next.example.test/movimientos/3f2b8c1e-9a4d-4c7e-8f00-1b2c3d4e5f60?q=ana@example.com#x",
        headers: { "User-Agent": "x", Referer: "https://next.example.test/?email=a@b.co" },
        cookies: { s: "1" },
        query_string: "q=ana",
      },
      exception: {
        values: [
          {
            type: "Error",
            value: "monto 300 inválido",
            stacktrace: { frames: [{ abs_path: "https://next.example.test/_next/static/chunks/123-abc.js", vars: { a: 1 } }] },
          },
        ],
      },
    };
  }

  it("drops user, extra, breadcrumbs, request details and unknown contexts", () => {
    const out = beforeSend(event());
    expect(out.user).toBeUndefined();
    expect(out.extra).toBeUndefined();
    expect(out.breadcrumbs).toBeUndefined();
    expect(out.request).toEqual({ url: "https://next.example.test/movimientos/[id]" });
    expect(out.contexts).toEqual({ os: { name: "Android" } });
  });

  it("scrubs every remaining string and keeps asset paths", () => {
    const out = beforeSend(event());
    expect(out.message).toBe("falló para [email]");
    expect(out.transaction).toBe("/movimientos/[id]");
    expect(out.tags).toEqual({ page: "/x/[n]", flag: true });
    const ex = out.exception?.values?.[0];
    expect(ex?.value).toBe("monto [n] inválido");
    expect(ex?.stacktrace?.frames?.[0]).toEqual({ abs_path: "https://next.example.test/_next/static/chunks/123-abc.js" });
    const raw = JSON.stringify(out);
    for (const secret of ["ana@example.com", "1234", "3f2b8c1e", "Cena con Ana"]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("drops an unparseable request URL and tolerates a bare event", () => {
    const out = beforeSend({ type: undefined, request: { url: "not a url" } });
    expect(out.request).toEqual({ url: undefined });
    expect(beforeSend({ type: undefined })).toEqual({ type: undefined, message: undefined, transaction: undefined });
  });
});

describe("initMonitoring", () => {
  beforeEach(() => sentry.init.mockReset());

  it("does nothing without a DSN", () => {
    expect(initMonitoring({ dsn: "", environment: "staging", release: "1" })).toBe(false);
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it("starts the SDK collecting no user data, breadcrumbs or default integrations", () => {
    expect(initMonitoring({ dsn: "https://k@errors.example.test/2", environment: "staging", release: "" })).toBe(true);
    const opts = sentry.init.mock.calls[0][0];
    expect(opts).toMatchObject({
      dsn: "https://k@errors.example.test/2",
      environment: "staging",
      release: undefined,
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
      defaultIntegrations: false,
      maxBreadcrumbs: 0,
      beforeSend,
    });
    const names = opts.integrations.map((i: { name: string }) => i.name);
    expect(names).toContain("GlobalHandlers");
    expect(names).not.toContain("Breadcrumbs");
  });
});

describe("captureError", () => {
  it("hands the caught error to the SDK", () => {
    const err = new Error("boom");
    captureError(err);
    expect(sentry.captureException).toHaveBeenCalledWith(err);
  });
});
