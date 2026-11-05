import { setupServer } from "msw/node";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";

/** Origin of the API in tests (NEXT_PUBLIC_API_URL in vitest.config.mts). */
export const API = "http://api.test";

/** Shared MSW server; tests add handlers with `server.use(...)`. */
export const server = setupServer();

/** A request as the API received it. */
export type Recorded = {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Headers;
  body: string;
};

const recorded: Recorded[] = [];

server.events.on("request:start", ({ request }) => {
  const url = new URL(request.url);
  // Record synchronously so the order matches the calls; the body (read
  // asynchronously) is filled in before the handler answers.
  const entry: Recorded = {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: request.headers,
    body: "",
  };
  recorded.push(entry);
  // Multipart bodies stream files; reading a clone can abort the request.
  if (request.headers.get("content-type")?.startsWith("multipart/")) return;
  void request
    .clone()
    .text()
    .then((b) => {
      entry.body = b;
    });
});

/** Every request seen since the last reset, oldest first. */
export function requests(): Recorded[] {
  return [...recorded];
}

/** The last request seen, failing loudly if there was none. */
export function lastRequest(): Recorded {
  const r = recorded.at(-1);
  if (!r) throw new Error("no request reached the API");
  return r;
}

export function resetRequests() {
  recorded.length = 0;
}

/** Logs a user in the stores, as the app does after login and bootstrap. */
export function signIn(opts: { token?: string; householdId?: string | null } = {}) {
  useAuthStore.setState({
    accessToken: opts.token ?? "access-1",
    accessExpiresAt: "2099-01-01T00:00:00Z",
    user: { id: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test", isSuperadmin: false },
    hydrated: true,
  });
  useHouseholdStore.setState({ currentId: opts.householdId === undefined ? "h1" : opts.householdId, resolvedFor: "u1" });
}

/** Clears both stores. */
export function signOut() {
  useAuthStore.setState({ accessToken: null, accessExpiresAt: null, user: null, hydrated: false });
  useHouseholdStore.setState({ currentId: null, resolvedFor: null });
}
