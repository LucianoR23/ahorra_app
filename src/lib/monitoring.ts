// Error monitoring (plan 0.12): uncaught errors and unhandled rejections go
// to GlitchTip (Sentry compatible). Events never carry personal data or
// amounts (plan §8b): no breadcrumbs, no user, no query string, no headers,
// and every string goes through scrub() before it leaves the browser.
import {
  browserApiErrorsIntegration,
  captureException,
  dedupeIntegration,
  eventFiltersIntegration,
  functionToStringIntegration,
  globalHandlersIntegration,
  httpContextIntegration,
  init,
  linkedErrorsIntegration,
  type ErrorEvent,
} from "@sentry/browser";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const UUID = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;
// Long opaque strings with a digit: tokens, hashes, keys.
const TOKEN = /[A-Za-z0-9_-]{32,}/g;
// Double quotes only: browsers name properties in single quotes
// ("reading 'map'"), which is what makes an error readable.
const QUOTED = /"[^"]*"/g;
// Any number left is treated as a possible amount.
const NUMBER = /\d+(?:[.,]\d+)*/g;

/** Removes e-mails, IDs, tokens, quoted values and every number. */
export function scrub(s: string): string;
export function scrub(s: string | undefined): string | undefined;
export function scrub(s: string | undefined): string | undefined {
  if (!s) return s;
  return s
    .replace(EMAIL, "[email]")
    .replace(JWT, "[token]")
    .replace(UUID, "[id]")
    .replace(TOKEN, (m) => (/\d/.test(m) ? "[token]" : m))
    .replace(QUOTED, '"[redacted]"')
    .replace(NUMBER, "[n]");
}

/** Keeps origin and path, with IDs and numbers scrubbed; drops query and hash. */
function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    return u.origin + scrub(u.pathname);
  } catch {
    return undefined;
  }
}

const KEPT_CONTEXTS = new Set(["os", "browser", "device", "culture", "trace"]);

/** Last filter before an event leaves the browser. */
export function beforeSend(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.extra;
  delete event.breadcrumbs;
  if (event.request) {
    event.request = { url: scrubUrl(event.request.url) };
  }
  if (event.contexts) {
    for (const k of Object.keys(event.contexts)) {
      if (!KEPT_CONTEXTS.has(k)) delete event.contexts[k];
    }
  }
  if (event.tags) {
    for (const [k, v] of Object.entries(event.tags)) {
      event.tags[k] = typeof v === "string" ? scrub(v) : v;
    }
  }
  event.message = scrub(event.message);
  event.transaction = scrub(event.transaction);
  for (const ex of event.exception?.values ?? []) {
    ex.value = scrub(ex.value);
    // Frame paths are build assets (/_next/static/...): kept as they are.
    for (const f of ex.stacktrace?.frames ?? []) delete f.vars;
  }
  return event;
}

export type MonitoringConfig = {
  dsn: string | undefined;
  environment: string | undefined;
  release: string | undefined;
};

/** Starts reporting when a DSN is set. Returns whether it did. */
export function initMonitoring({ dsn, environment, release }: MonitoringConfig): boolean {
  if (!dsn) return false;
  init({
    dsn,
    environment: environment || undefined,
    release: release || undefined,
    // Collect nothing about the user or the requests; beforeSend still
    // filters whatever an integration adds.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    // Only the integrations that catch errors. No breadcrumbs (clicks keep
    // the text on screen, fetches keep URLs), console capture or sessions.
    defaultIntegrations: false,
    integrations: [
      eventFiltersIntegration(),
      functionToStringIntegration(),
      browserApiErrorsIntegration(),
      globalHandlersIntegration(),
      linkedErrorsIntegration(),
      dedupeIntegration(),
      httpContextIntegration(),
    ],
    maxBreadcrumbs: 0,
    // Browser extensions throw into the page; not our errors.
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-web-extension:\/\//],
    beforeSend,
  });
  return true;
}

/**
 * Reports an error a React boundary caught (error.tsx). Those never reach
 * the global handlers. A no-op until initMonitoring ran; beforeSend scrubs it.
 */
export function captureError(error: unknown): void {
  captureException(error);
}
