// The two request runners that carry the session (swrFetcher for reads,
// apiMutate for writes) share the same contract: token and household from the
// stores, and one refresh-and-retry on 401.
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth";
import { API, lastRequest, requests, server, signIn, signOut } from "@/test/msw";
import { apiMutate } from "./mutations";
import { swrFetcher } from "./swr-fetcher";

const unauthorized = () => HttpResponse.json({ code: "unauthorized", message: "token vencido" }, { status: 401 });
const refreshOK = () => HttpResponse.json({ accessToken: "access-2", accessExpiresAt: "2099-01-02T00:00:00Z" });

const runners = {
  swrFetcher: (path: string, householdScoped = true) => swrFetcher([path, { householdScoped }] as const),
  apiMutate: (path: string, householdScoped = true) => apiMutate({ method: "GET", path, householdScoped }),
};

describe.each(Object.entries(runners))("%s", (_name, run) => {
  beforeEach(() => signIn({ token: "access-1", householdId: "h1" }));

  it("sends the stored token and household", async () => {
    server.use(http.get(`${API}/categories`, () => HttpResponse.json([])));
    await run("/categories");
    expect(lastRequest().headers.get("authorization")).toBe("Bearer access-1");
    expect(lastRequest().headers.get("x-household-id")).toBe("h1");
  });

  it("leaves the household out when not household scoped", async () => {
    server.use(http.get(`${API}/households`, () => HttpResponse.json([])));
    await run("/households", false);
    expect(lastRequest().headers.get("x-household-id")).toBeNull();
  });

  it("on 401 refreshes once and retries with the new token", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/categories`, ({ request }) => {
        calls++;
        return request.headers.get("authorization") === "Bearer access-2" ? HttpResponse.json(["ok"]) : unauthorized();
      }),
      http.post(`${API}/auth/refresh`, refreshOK),
    );
    await expect(run("/categories")).resolves.toEqual(["ok"]);
    expect(calls).toBe(2);
    expect(useAuthStore.getState().accessToken).toBe("access-2");
    expect(useAuthStore.getState().accessExpiresAt).toBe("2099-01-02T00:00:00Z");
  });

  it("when the refresh fails, clears the session and rethrows the 401", async () => {
    server.use(
      http.get(`${API}/categories`, unauthorized),
      http.post(`${API}/auth/refresh`, () => HttpResponse.json({ code: "unauthorized" }, { status: 401 })),
    );
    await expect(run("/categories")).rejects.toMatchObject({ code: "unauthorized", message: "token vencido" });
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, user: null });
  });

  it("concurrent 401s share a single refresh", async () => {
    let refreshes = 0;
    server.use(
      http.get(`${API}/categories`, ({ request }) =>
        request.headers.get("authorization") === "Bearer access-2" ? HttpResponse.json([]) : unauthorized(),
      ),
      http.post(`${API}/auth/refresh`, () => {
        refreshes++;
        return refreshOK();
      }),
    );
    await Promise.all([run("/categories"), run("/categories"), run("/categories")]);
    expect(refreshes).toBe(1);
  });

  it("other errors are not retried", async () => {
    server.use(http.get(`${API}/categories`, () => HttpResponse.json({ code: "forbidden" }, { status: 403 })));
    await expect(run("/categories")).rejects.toMatchObject({ code: "forbidden" });
    expect(requests().filter((r) => r.path === "/auth/refresh")).toHaveLength(0);
  });

  it("works without a session (no Authorization header)", async () => {
    signOut();
    server.use(http.get(`${API}/push/vapid-public-key`, () => HttpResponse.json({ enabled: false })));
    await run("/push/vapid-public-key", false);
    expect(lastRequest().headers.get("authorization")).toBeNull();
  });
});

it("swrFetcher accepts a plain string key and forwards query params", async () => {
  signIn();
  server.use(http.get(`${API}/expenses`, () => HttpResponse.json({ items: [] })));
  await swrFetcher("/expenses");
  expect(lastRequest().headers.get("x-household-id")).toBe("h1");
  await swrFetcher(["/expenses", { query: { limit: 5 } }] as const);
  expect(lastRequest().query).toEqual({ limit: "5" });
});

it("reads and writes share one refresh in flight", async () => {
  signIn({ token: "access-1" });
  let refreshes = 0;
  server.use(
    http.get(`${API}/categories`, ({ request }) =>
      request.headers.get("authorization") === "Bearer access-2" ? HttpResponse.json([]) : unauthorized(),
    ),
    http.post(`${API}/auth/refresh`, () => {
      refreshes++;
      return refreshOK();
    }),
  );
  await Promise.all([runners.swrFetcher("/categories"), runners.apiMutate("/categories")]);
  expect(refreshes).toBe(1);
});
