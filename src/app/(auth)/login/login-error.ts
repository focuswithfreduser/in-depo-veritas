import type { AccessDeniedReason } from "@/lib/access-control";

/**
 * The error shape `authClient.signIn.emailOtp` returns in its `{ error }`
 * field. Better Auth surfaces a Better Fetch error with a `code` and HTTP
 * `status`; we only read what we need to discriminate.
 */
export type OtpSignInErrorLike =
  | {
      code?: string | null;
      status?: number | null;
      message?: string | null;
    }
  | null
  | undefined;

/**
 * Classify the error returned when verifying an OTP at sign-in.
 *
 * Session creation is rejected (HTTP 403 FORBIDDEN) with a discriminating
 * `code` when the user may not sign in:
 *  - `BANNED_USER` — set by Better Auth's `admin()` plugin for a suspended
 *    user (IMP-002).
 *  - `ACCESS_EXPIRED` — set by our own `session.create.before` gate in
 *    `src/lib/auth.ts` for a user whose time-limited access has lapsed
 *    (IMP-003).
 *
 * Before this, every error here collapsed to a generic "Incorrect code", so a
 * blocked user assumed they had mistyped. We branch on the `code` so the
 * caller can show a clear message instead.
 *
 * Returns the access-denied reason for a hard block (banner, no retry), or
 * `null` for an ordinary bad/expired code (handled as before).
 */
export function classifyOtpSignInError(
  error: OtpSignInErrorLike,
): AccessDeniedReason | null {
  if (!error) return null;
  if (error.code === "BANNED_USER") return "suspended";
  if (error.code === "ACCESS_EXPIRED") return "access-expired";
  return null;
}
