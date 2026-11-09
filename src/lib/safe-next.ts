/**
 * Where to go after signing in: the `next` query param when it is a path of
 * this app, "/" otherwise. Rejects other origins ("//evil.com", "/\evil.com",
 * "https://...") so the param cannot be used as an open redirect.
 */
export function safeNext(search: string | URLSearchParams | null | undefined): string {
  const params = typeof search === "string" || !search ? new URLSearchParams(search ?? "") : search;
  const next = params.get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  try {
    const url = new URL(next, "http://app.local");
    if (url.origin !== "http://app.local") return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
