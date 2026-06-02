import { createCaller } from "@/server/api/root";
import { db } from "@/lib/db";

import { type SessionLike, makeSession } from "./factories";

type BuildCallerOptions = {
  session?: SessionLike | null;
  hasApiKey?: boolean;
};

// Build a tRPC server caller with a synthetic context. By default it
// produces a logged-in user with an active organization. Pass
// `session: null` for the unauthenticated case.
export function buildCaller(opts: BuildCallerOptions = {}) {
  const session = opts.session === null ? null : opts.session ?? makeSession();
  const user = session?.user ?? null;

  return createCaller({
    db,
    session: session as never,
    user: user as never,
    hasApiKey: opts.hasApiKey ?? false,
    headers: new Headers(),
  });
}

export function buildAdminCaller() {
  return buildCaller({
    session: makeSession({ user: { role: "admin" } }),
  });
}

export function buildAnonymousCaller() {
  return buildCaller({ session: null });
}

export function buildCallerWithoutOrg() {
  return buildCaller({
    session: makeSession({ activeOrganizationId: null }),
  });
}
