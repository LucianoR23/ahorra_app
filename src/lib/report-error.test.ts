import { afterEach, describe, expect, it, vi } from "vitest";

const captureError = vi.hoisted(() => vi.fn());
vi.mock("@/lib/monitoring", () => ({ captureError }));

import { reportError } from "./report-error";

afterEach(() => {
  vi.unstubAllEnvs();
  captureError.mockClear();
});

describe("reportError", () => {
  it("sends the error when a DSN is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_GLITCHTIP_DSN", "https://key@errors.example.com/1");
    const err = new Error("boom");
    reportError(err);
    await vi.waitFor(() => expect(captureError).toHaveBeenCalledWith(err));
  });

  it("does nothing without a DSN", async () => {
    vi.stubEnv("NEXT_PUBLIC_GLITCHTIP_DSN", "");
    reportError(new Error("boom"));
    await new Promise((r) => setTimeout(r, 0));
    expect(captureError).not.toHaveBeenCalled();
  });
});
