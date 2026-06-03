/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError, treeifyError } from "zod";
import { Session, User } from "better-auth";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Subscription, Trial } from "@/app/generated/prisma";
import { env } from "@/create-env.mjs";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { headers } = opts;
  // Get session from Better Auth
  let session = null;
  let user = null;

  try {
    const authSession = await auth.api.getSession({
      headers: headers,
    });
    session = authSession;
    user = authSession?.user || null;
  } catch {
    // Session doesn't exist or is invalid - this is expected for public endpoints
  }

  return {
    db,
    session,
    user,
    hasApiKey:
      !!opts.headers.get("x-api-key") &&
      opts.headers.get("x-api-key") === env.SCREENSHOT_API_KEY,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? treeifyError(error.cause) : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next }) => {
  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  return next();
});

export const requiresSubscriptionMiddleware = t.middleware(
  async ({ ctx, next }) => {
    if (!ctx.session || !ctx.session.session.activeOrganizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });
    }

    const organization = await db.organization.findFirstOrThrow({
      where: {
        id: ctx.session.session.activeOrganizationId,
      },
      include: {
        trial: true,
        subscriptions: {
          where: { status: { in: ["active", "canceled"] } },
        },
      },
    });

    let authorization: Subscription | Trial | { freeForever: true };
    if (organization.freeForever) {
      authorization = { freeForever: true };
    } else if (organization.subscriptions.length) {
      authorization = organization.subscriptions[0];
    } else if (organization.trial) {
      if (new Date() > organization.trial.endsAt) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message:
            "Organization does not have an active subscription and its trial period has ended.",
        });
      }
      authorization = organization.trial;
    } else {
      // TODO: Remove this code branch once the Organization -> Trial
      // relation is not nullable anymore.
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error inferring authorization for organization '${organization.id}'. Have all migrations been applied?`,
      });
    }

    return next<
      typeof ctx & {
        authorization: Subscription | Trial | { freeForever: true };
      }
    >({
      ctx: {
        ...ctx,
        authorization,
      },
    });
  },
);

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Per-request access enforcement.
    // Two independent gates:
    //  (1) Suspension (banned + optional banExpires): blocked NOW, lifts at
    //      banExpires. Better Auth only checks this at session-creation, so
    //      we re-check on every request and lazily clear expired bans.
    //  (2) Access expiry (accessExpiresAt): user had a positive grant that
    //      has now run out. We block and revoke sessions.
    const dbUser = await db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { banned: true, banExpires: true, accessExpiresAt: true },
    });

    if (dbUser?.banned) {
      if (dbUser.banExpires && dbUser.banExpires.getTime() < Date.now()) {
        await db.user.update({
          where: { id: ctx.session.user.id },
          data: { banned: false, banExpires: null, banReason: null },
        });
      } else {
        await db.session.deleteMany({
          where: { userId: ctx.session.user.id },
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Your account has been suspended.",
        });
      }
    }

    if (
      dbUser?.accessExpiresAt &&
      dbUser.accessExpiresAt.getTime() < Date.now()
    ) {
      await db.session.deleteMany({
        where: { userId: ctx.session.user.id },
      });
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Your access has expired.",
      });
    }

    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
        user: ctx.session.user,
        db: ctx.db,
      },
    });
  });

export const protectedOrganizationProcedure = protectedProcedure.use(
  ({ ctx, next }) => {
    if (!ctx.session?.session.activeOrganizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });
    }

    return next({
      ctx: {
        ...ctx,
        session: {
          ...ctx.session,
          session: {
            ...(ctx.session.session as typeof ctx.session.session & {
              activeOrganizationId: string;
            }),
          },
        },
      },
    });
  },
);

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session?.user?.role !== "admin") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

export const adminOrApiKeyProcedure = publicProcedure.use(({ ctx, next }) => {
  if (ctx.session?.user?.role !== "admin" && !ctx.hasApiKey) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});
