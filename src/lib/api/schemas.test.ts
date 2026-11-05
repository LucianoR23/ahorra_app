import { describe, expect, it } from "vitest";
import { authResponseSchema, insightSchema, userSchema } from "./schemas";

describe("schemas", () => {
  it("user: isSuperadmin defaults to false, emailVerifiedAt is optional", () => {
    expect(userSchema.parse({ id: "u1", email: "a@b.cd", firstName: "A", lastName: "" })).toEqual({
      id: "u1", email: "a@b.cd", firstName: "A", lastName: "", isSuperadmin: false,
    });
    expect(() => userSchema.parse({ id: "u1", email: "no-mail", firstName: "A", lastName: "" })).toThrow();
  });

  it("auth response requires the token and its expiry", () => {
    const user = { id: "u1", email: "a@b.cd", firstName: "A", lastName: "" };
    expect(() => authResponseSchema.parse({ user, accessToken: "t" })).toThrow();
  });

  const insight = {
    id: "n1", householdId: "h1", insightDate: "2026-03-12", insightType: "alert",
    title: "t", body: "b", isRead: false, createdAt: "2026-03-12T10:00:00Z",
  };

  it("insight accepts the info and warning severities", () => {
    for (const severity of ["info", "warning"]) {
      expect(insightSchema.parse({ ...insight, severity }).severity).toBe(severity);
    }
  });

  // Audit section 10, bug 2: the API emits "critical"; the front end expects
  // "danger", so critical alerts render as plain info.
  it.fails("insight accepts the API's critical severity", () => {
    expect(insightSchema.parse({ ...insight, severity: "critical" }).severity).toBe("critical");
  });
});
