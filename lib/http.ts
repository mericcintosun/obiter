// The one request check this app makes before it writes or spends.
//
// Obiter is deployed at a public URL with three anonymous API routes. Two of
// them change something: POST /api/close/journal can reset the whole close
// ledger, and POST /api/precedent reaches a paid model. Both are driven only by
// components/close-queue.tsx, which runs on the same origin as the routes it
// calls. Nothing else has any business posting to them.
//
// Why an absent Origin passes. A browser sets Origin on every cross-site POST,
// which is the request this guard exists to turn away. It is a non-browser
// caller (curl, a server-to-server check, the runner's own smoke test) that
// sends no Origin at all, and refusing those would break the checks without
// closing the hole. So absence is allowed and a mismatch is not: the guard is
// aimed at the one caller that always identifies itself.
//
// Why a mismatch does not pass. If a header is there and names a different
// host, the request came from a page the controller did not open, which is the
// definition of the attack: a tab on another site posting {"op":"reset"} while
// the close screen is being recorded.
//
// This is deliberately not an allowlist and reads no environment variable. One
// rule, readable in one screen, with nothing to keep in step with a deploy URL.

/** True when the request carries no Origin, or one whose host matches this route's. */
export function sameOriginOk(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    // An Origin header that is not a URL is not a browser we recognise.
    return false;
  }
}
