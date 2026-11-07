import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps a text color next to a brand type size", () => {
    expect(cn("text-primary-foreground", "text-body")).toBe("text-primary-foreground text-body");
    expect(cn("text-ink-muted text-caption")).toBe("text-ink-muted text-caption");
  });

  it("still lets a later size win over an earlier one", () => {
    expect(cn("text-body", "text-caption")).toBe("text-caption");
    expect(cn("text-sm", "text-heading")).toBe("text-heading");
  });
});
