// Security headers for every page (plan 0.16). Built in next.config.ts at
// build time, like the NEXT_PUBLIC_* values they read.
//
// Scripts use 'unsafe-inline' on purpose (decided with the user): a nonce
// would force every page to render per request and break static rendering
// and the Serwist precache. Everything else is locked down.

const GOOGLE = "https://accounts.google.com";

export type SecurityHeadersOptions = {
  apiUrl: string;
  dev: boolean;
  /** GlitchTip DSN (plan 0.12): its origin receives error events. */
  glitchtipDsn?: string;
};

function origin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

export function contentSecurityPolicy({ apiUrl, dev, glitchtipDsn }: SecurityHeadersOptions): string {
  const api = origin(apiUrl);
  const glitchtip = glitchtipDsn ? origin(glitchtipDsn) : "";
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-eval' only in dev: React's dev tooling needs it.
    "script-src": ["'self'", "'unsafe-inline'", `${GOOGLE}/gsi/client`, ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'", `${GOOGLE}/gsi/style`],
    // Support attachments come from the support service's storage (any https host).
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "media-src": ["'self'", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", api, `${GOOGLE}/gsi/`, glitchtip].filter(Boolean),
    "frame-src": [GOOGLE],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  // No upgrade-insecure-requests: production is https already (HSTS) and
  // the e2e suite runs the production build on http://localhost.
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");
}

export function securityHeaders(opts: SecurityHeadersOptions): { key: string; value: string }[] {
  const headers = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(opts) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    // same-origin-allow-popups: Google Sign-In may open a popup.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    // microphone=(self): voice entry (plan 3.2), our own pages only.
    { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()" },
  ];
  if (!opts.dev) {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
  }
  return headers;
}
