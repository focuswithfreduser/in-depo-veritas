/**
 * Shared access-control discriminator used to give users a clear, specific
 * reason when they are blocked — at login or mid-session — instead of the
 * generic "incorrect code" / silent-logout behaviour (QA items IMP-002 and
 * IMP-003).
 *
 * The backend (`protectedProcedure`) already re-checks suspension and access
 * expiry on every request and throws clear messages. This module gives those
 * throws a machine-readable discriminator so the client can branch reliably
 * without matching on brittle message strings.
 *
 * This file is intentionally free of server-only imports so it can be shared
 * by the tRPC backend (`src/server/api/trpc.ts`) and the browser client
 * (`src/trpc/react.tsx`, the login form).
 */

export const ACCESS_DENIED_REASONS = ["suspended", "access-expired"] as const;

export type AccessDeniedReason = (typeof ACCESS_DENIED_REASONS)[number];

/**
 * Attached as the `cause` of the `TRPCError` thrown when access is denied so
 * the error formatter can surface a stable `accessDeniedReason` discriminator
 * to the client (see `errorFormatter` in `src/server/api/trpc.ts`).
 */
export class AccessDeniedError extends Error {
  readonly reason: AccessDeniedReason;

  constructor(reason: AccessDeniedReason) {
    super(`access-denied:${reason}`);
    this.name = "AccessDeniedError";
    this.reason = reason;
  }
}

/** User-facing copy shown on the login screen for each reason. */
export const ACCESS_DENIED_MESSAGES: Record<AccessDeniedReason, string> = {
  suspended:
    "Your account has been suspended. Please contact your administrator.",
  "access-expired":
    "Your access has expired. Please contact your administrator to extend access.",
};

export function isAccessDeniedReason(
  value: unknown,
): value is AccessDeniedReason {
  return (
    typeof value === "string" &&
    (ACCESS_DENIED_REASONS as readonly string[]).includes(value)
  );
}

/**
 * Read the discriminator off the `cause` of a thrown error (server side, where
 * we still hold the `AccessDeniedError` instance).
 */
export function accessDeniedReasonFromCause(
  error: unknown,
): AccessDeniedReason | null {
  return error instanceof AccessDeniedError ? error.reason : null;
}

/**
 * Read the discriminator off a tRPC client error. The reason is surfaced on
 * `error.data.accessDeniedReason` by the server error formatter.
 */
export function getAccessDeniedReason(
  error: unknown,
): AccessDeniedReason | null {
  if (!error || typeof error !== "object") return null;
  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const reason = (data as { accessDeniedReason?: unknown }).accessDeniedReason;
  return isAccessDeniedReason(reason) ? reason : null;
}

/**
 * Decide where (if anywhere) to send the user after an access-denied error.
 *
 * Returns the login URL carrying the reason, or `null` when no redirect should
 * happen — either because the error is an ordinary one (a plain `UNAUTHORIZED`
 * from a normal logout carries no discriminator) or because we are already on
 * the login screen and would otherwise loop.
 */
export function accessDeniedRedirectTarget(
  error: unknown,
  currentPath: string,
): string | null {
  const reason = getAccessDeniedReason(error);
  if (!reason) return null;
  if (currentPath.startsWith("/login")) return null;
  return `/login?reason=${reason}`;
}
