import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Tests run in the product's timezone (plan §0); set TZ before dates are built.
process.env.TZ = "America/Argentina/Buenos_Aires";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
