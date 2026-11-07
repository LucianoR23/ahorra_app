import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name, values];
    }),
  );
}

describe("security headers", () => {
  const prod = { apiUrl: "https://api-next.example.test/", dev: false };

  it("locks down everything but inline scripts", () => {
    const d = directives(contentSecurityPolicy(prod));
    expect(d.get("frame-ancestors")).toEqual(["'none'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'none'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("script-src")).not.toContain("'unsafe-eval'");
  });

  it("lets the app reach its API origin and Google Sign-In", () => {
    const d = directives(contentSecurityPolicy(prod));
    expect(d.get("connect-src")).toEqual(["'self'", "https://api-next.example.test", "https://accounts.google.com/gsi/"]);
    expect(d.get("script-src")).toContain("https://accounts.google.com/gsi/client");
    expect(d.get("frame-src")).toEqual(["https://accounts.google.com"]);
  });

  it("lets error events reach the GlitchTip origin, without the DSN key", () => {
    const d = directives(contentSecurityPolicy({ ...prod, glitchtipDsn: "https://publickey@errors.example.test/2" }));
    expect(d.get("connect-src")).toContain("https://errors.example.test");
    expect(d.get("connect-src")?.join(" ")).not.toContain("publickey");
    expect(directives(contentSecurityPolicy({ ...prod, glitchtipDsn: "" })).get("connect-src")).toHaveLength(3);
  });

  it("drops an unparseable API URL instead of allowing it", () => {
    const d = directives(contentSecurityPolicy({ apiUrl: "not a url", dev: false }));
    expect(d.get("connect-src")).toEqual(["'self'", "https://accounts.google.com/gsi/"]);
  });

  it("relaxes only what dev tooling needs", () => {
    const dev = { apiUrl: "http://localhost:8080", dev: true };
    const d = directives(contentSecurityPolicy(dev));
    expect(d.get("script-src")).toContain("'unsafe-eval'");
    expect(securityHeaders(dev).map((h) => h.key)).not.toContain("Strict-Transport-Security");
  });

  it("sends HSTS and the other headers in production", () => {
    const h = Object.fromEntries(securityHeaders(prod).map((x) => [x.key, x.value]));
    expect(h["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["X-Frame-Options"]).toBe("DENY");
  });
});
