// The one place this app reads the environment.
//
// Nothing else under lib/, app/ or components/ touches process.env. Two reasons
// that rule is worth keeping:
//
//   1. A secret has exactly one door. Nothing here is prefixed NEXT_PUBLIC_, so
//      nothing here can be inlined into a browser bundle by accident.
//   2. Every knob the app has is readable in one screen, which is what makes
//      .env.example checkable against the code rather than against memory.
//
// The scripts under scripts/*.mjs read the environment directly, because they
// run under plain node with no bundler and never ship to a browser.

export type AdapterMode = "fake" | "real";

/** Anything that is not exactly "real" is fake. Absence of a key is not a mode. */
export function adapterMode(): AdapterMode {
  return process.env.ADAPTER_MODE === "real" ? "real" : "fake";
}

/** Neon pooled connection string. Empty means the app runs on the memory store. */
export const DATABASE_URL = process.env.DATABASE_URL ?? "";

/** Which close the journal rows belong to. A label, not a secret. */
export const CLOSE_ID = process.env.OBITER_CLOSE_ID ?? "halden-2026-08";

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
export const ANTHROPIC_URL =
  process.env.ANTHROPIC_URL ?? "https://api.anthropic.com/v1/messages";

export const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY ?? "";
export const DODO_API_BASE =
  process.env.DODO_PAYMENTS_API_BASE ?? "https://test.dodopayments.com";

// ---------------------------------------------------------------------------
// Named constants. No file on the core path carries an inline number for any of
// these, so a timeout is changed in one place and means the same thing twice.
// ---------------------------------------------------------------------------

/** How long any single upstream HTTP call may take before it is abandoned. */
export const UPSTREAM_TIMEOUT_MS = 20_000;

/** Exactly one retry. A core path call runs at most twice, never in a loop. */
export const UPSTREAM_RETRIES = 1;

/** The local `claude` CLI is slower than the API and gets its own budget. */
export const CLI_TIMEOUT_MS = 45_000;

/** The compile step is on camera and the demo contract allows it five seconds of feel, so the model gets six and then loses its turn. */
export const COMPILE_TIMEOUT_MS = 6_000;

/** A retry would double the worst case, and the next compiler in the chain is the retry. */
export const COMPILE_RETRIES = 0;

/** Set by the Vercel platform, never by hand. The `claude` binary is not installed there. */
export const RUNNING_ON_VERCEL = process.env.VERCEL === "1";

/** A database that has not answered in this long is treated as down. */
export const DB_TIMEOUT_MS = 5_000;

/** How many compile results the in-process cache holds before it evicts. */
export const COMPILE_CACHE_MAX = 50;

/** How many journal idempotency keys one server instance remembers before it evicts. */
export const JOURNAL_KEY_MAX = 200;

/** Every core path log line starts with this, so one grep finds the whole run. */
export const LOG_PREFIX = "[core]";
