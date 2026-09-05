// One error vocabulary for every failure that crosses a boundary.
//
// `error` is the machine-readable code and it comes from a closed union, so a
// caller can branch on it. `hint` is one plain sentence written for the
// controller reading the screen: never a stack trace, never a provider message
// passed through verbatim, never anything that could carry a key or a body.

export type ErrorCode =
  | "invalid_input"
  | "upstream_timeout"
  | "upstream_error"
  | "parse_failure"
  | "not_configured"
  | "store_unavailable";

/** Every handler in this app answers a failure with exactly this body. */
export interface Failure {
  error: ErrorCode;
  hint: string;
}

export function fail(error: ErrorCode, hint: string): Failure {
  return { error, hint };
}
