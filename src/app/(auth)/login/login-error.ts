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
 * A suspended (banned) user's session creation is rejected by Better Auth's
 * `admin()` plugin with `code: "BANNED_USER"` / HTTP 403 (FORBIDDEN). Before
 * IMP-002 every error here collapsed to a generic "Incorrect code", so a
 * suspended user assumed they had mistyped. We pick out the suspension case so
 * the caller can show a clear message instead.
 *
 * Returns the access-denied reason for a hard block (banner, no retry), or
 * `null` for an ordinary bad/expired code (handled as before).
 *
 * Note: an access-*expired* user is NOT detectable here — Better Auth only
 * checks `banned` at sign-in, not `accessExpiresAt`, so an expired user can
 * still complete OTP login and is blocked on their first protected request
 * (handled by the global error handler in `src/trpc/react.tsx`).
 */
export function classifyOtpSignInError(
  error: OtpSignInErrorLike,
): AccessDeniedReason | null {
  if (!error) return null;
  if (error.code === "BANNED_USER") return "suspended";
  if (error.status === 403) return "suspended";
  return null;
}
