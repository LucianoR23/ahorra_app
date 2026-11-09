import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps a path of the app, with its query", () => {
    expect(safeNext("?next=%2Finvite%2Faccept%3Ftoken%3Dabc")).toBe("/invite/accept?token=abc");
  });

  it.each([
    ["no param", ""],
    ["another origin", "?next=https%3A%2F%2Fevil.com"],
    ["protocol-relative", "?next=%2F%2Fevil.com"],
    ["backslash trick", "?next=%2F%5Cevil.com"],
    ["not a path", "?next=evil"],
  ])("falls back to home for %s", (_, search) => {
    expect(safeNext(search)).toBe("/");
  });
});
