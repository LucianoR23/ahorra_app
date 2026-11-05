import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { resetRequests, server } from "./src/test/msw";

// Tests run in the product's timezone (plan §0); set TZ before dates are built.
process.env.TZ = "America/Argentina/Buenos_Aires";

// Every request must hit a handler: an unmocked call fails the test (plan §0:
// external services are always mocked).
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  globalThis.localStorage?.clear(); // absent in node-environment test files
  server.resetHandlers();
  resetRequests();
});
afterAll(() => server.close());
