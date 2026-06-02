import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import {
  adminOrApiKeyProcedure,
  adminProcedure,
  createCallerFactory,
  createTRPCRouter,
  protectedOrganizationProcedure,
  protectedProcedure,
  publicProcedure,
  requiresSubscriptionMiddleware,
} from "@/server/api/trpc";
import { db } from "@/lib/db";
import { dbMock } from "@/test/mocks/db";
import { makeOrganization, makeSession, makeTrial, makeSubscription } from "@/test/factories";

// A tiny router built only out of the procedures we want to exercise.
// Each query echoes something derived from ctx so we can assert what
// the middleware narrowed.
const testRouter = createTRPCRouter({
  publicNoop: publicProcedure.query(() => "ok"),
  protectedNoop: protectedProcedure.query(({ ctx }) => ctx.user.id),
  protectedOrgNoop: protectedOrganizationProcedure.query(
    ({ ctx }) => ctx.session.session.activeOrganizationId,
  ),
  adminNoop: adminProcedure.query(() => "admin-only"),
  adminOrApiKeyNoop: adminOrApiKeyProcedure.query(() => "ok"),
  subscriptionNoop: publicProcedure
    .use(requiresSubscriptionMiddleware)
    .query(({ ctx }) => ctx.authorization),
});

const createCaller = createCallerFactory(testRouter);

function caller(opts: {
  session?: ReturnType<typeof makeSession> | null;
  hasApiKey?: boolean;
}) {
  const session = opts.session === null ? null : opts.session ?? makeSession();
  return createCaller({
    db,
    session: session as never,
    user: (session?.user ?? null) as never,
    hasApiKey: opts.hasApiKey ?? false,
    headers: new Headers(),
  });
}

describe("publicProcedure", () => {
  it("works without a session", async () => {
    const c = caller({ session: null });
    await expect(c.publicNoop()).resolves.toBe("ok");
  });
});

describe("protectedProcedure", () => {
  it("rejects an unauthenticated caller with UNAUTHORIZED", async () => {
    const c = caller({ session: null });
    await expect(c.protectedNoop()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("passes when a user session exists", async () => {
    const session = makeSession();
    const c = caller({ session });
    await expect(c.protectedNoop()).resolves.toBe(session.user.id);
  });

  describe("suspension fallback (banned/banExpires)", () => {
    it("blocks a user with an active time-limited suspension and revokes their sessions", async () => {
      const session = makeSession();
      dbMock.user.findUnique.mockResolvedValueOnce({
        banned: true,
        banExpires: new Date(Date.now() + 60 * 60 * 1000),
        accessExpiresAt: null,
      } as never);
      dbMock.session.deleteMany.mockResolvedValueOnce({ count: 1 } as never);

      const c = caller({ session });
      await expect(c.protectedNoop()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      expect(dbMock.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: session.user.id },
      });
      expect(dbMock.user.update).not.toHaveBeenCalled();
    });

    it("blocks a permanently suspended user (banned with no expiry)", async () => {
      const session = makeSession();
      dbMock.user.findUnique.mockResolvedValueOnce({
        banned: true,
        banExpires: null,
        accessExpiresAt: null,
      } as never);
      dbMock.session.deleteMany.mockResolvedValueOnce({ count: 1 } as never);

      const c = caller({ session });
      await expect(c.protectedNoop()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("lazily clears an expired suspension and lets the request through", async () => {
      const session = makeSession();
      dbMock.user.findUnique.mockResolvedValueOnce({
        banned: true,
        banExpires: new Date(Date.now() - 60_000),
        accessExpiresAt: null,
      } as never);
      dbMock.user.update.mockResolvedValueOnce({} as never);

      const c = caller({ session });
      await expect(c.protectedNoop()).resolves.toBe(session.user.id);
      expect(dbMock.user.update).toHaveBeenCalledWith({
        where: { id: session.user.id },
        data: { banned: false, banExpires: null, banReason: null },
      });
      expect(dbMock.session.deleteMany).not.toHaveBeenCalled();
    });

    it("does no DB writes for a user who is unrestricted", async () => {
      const session = makeSession();
      dbMock.user.findUnique.mockResolvedValueOnce({
        banned: false,
        banExpires: null,
        accessExpiresAt: null,
      } as never);

      const c = caller({ session });
      await expect(c.protectedNoop()).resolves.toBe(session.user.id);
      expect(dbMock.user.update).not.toHaveBeenCalled();
      expect(dbMock.session.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("access-expiry enforcement (accessExpiresAt)", () => {
    it("lets the request through while accessExpiresAt is in the future", async () => {
      const session = makeSession();
      dbMock.user.findUnique.mockResolvedValueOnce({
        banned: false,
        banExpires: null,
        accessExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      } as never);

      const c = caller({ session });
      await expect(c.protectedNoop()).resolves.toBe(session.user.id);
      expect(dbMock.session.deleteMany).not.toHaveBeenCalled();
    });

    it("blocks when accessExpiresAt has passed and revokes sessions", async () => {
      const session = makeSession();
      dbMock.user.findUnique.mockResolvedValueOnce({
        banned: false,
        banExpires: null,
        accessExpiresAt: new Date(Date.now() - 60_000),
      } as never);
      dbMock.session.deleteMany.mockResolvedValueOnce({ count: 1 } as never);

      const c = caller({ session });
      await expect(c.protectedNoop()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      expect(dbMock.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: session.user.id },
      });
    });

    it("suspension takes precedence over access expiry when both are set", async () => {
      const session = makeSession();
      dbMock.user.findUnique.mockResolvedValueOnce({
        banned: true,
        banExpires: new Date(Date.now() + 60 * 60 * 1000),
        accessExpiresAt: new Date(Date.now() - 60_000),
      } as never);
      dbMock.session.deleteMany.mockResolvedValueOnce({ count: 1 } as never);

      const c = caller({ session });
      await expect(c.protectedNoop()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: expect.stringMatching(/suspended/i),
      });
    });
  });
});

describe("protectedOrganizationProcedure", () => {
  it("rejects when there is no session", async () => {
    const c = caller({ session: null });
    await expect(c.protectedOrgNoop()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects when the user has no active organization", async () => {
    const c = caller({
      session: makeSession({ activeOrganizationId: null }),
    });
    await expect(c.protectedOrgNoop()).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("returns the activeOrganizationId when one is set", async () => {
    const session = makeSession({ activeOrganizationId: "org_abc" });
    const c = caller({ session });
    await expect(c.protectedOrgNoop()).resolves.toBe("org_abc");
  });
});

describe("adminProcedure", () => {
  it("rejects a logged-in non-admin user", async () => {
    const c = caller({ session: makeSession({ user: { role: null } }) });
    await expect(c.adminNoop()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects an unauthenticated caller", async () => {
    const c = caller({ session: null });
    await expect(c.adminNoop()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("allows users with role='admin'", async () => {
    const c = caller({ session: makeSession({ user: { role: "admin" } }) });
    await expect(c.adminNoop()).resolves.toBe("admin-only");
  });
});

describe("adminOrApiKeyProcedure", () => {
  it("rejects an anonymous caller without an API key", async () => {
    const c = caller({ session: null, hasApiKey: false });
    await expect(c.adminOrApiKeyNoop()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a regular user without an API key", async () => {
    const c = caller({
      session: makeSession({ user: { role: null } }),
      hasApiKey: false,
    });
    await expect(c.adminOrApiKeyNoop()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("allows admin without an API key", async () => {
    const c = caller({
      session: makeSession({ user: { role: "admin" } }),
      hasApiKey: false,
    });
    await expect(c.adminOrApiKeyNoop()).resolves.toBe("ok");
  });

  it("allows a non-admin caller when the API key flag is set", async () => {
    const c = caller({ session: null, hasApiKey: true });
    await expect(c.adminOrApiKeyNoop()).resolves.toBe("ok");
  });
});

describe("requiresSubscriptionMiddleware", () => {
  it("rejects when there is no active organization", async () => {
    const c = caller({
      session: makeSession({ activeOrganizationId: null }),
    });
    await expect(c.subscriptionNoop()).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("authorizes a freeForever organization", async () => {
    const session = makeSession({ activeOrganizationId: "org_free" });
    dbMock.organization.findFirstOrThrow.mockResolvedValue({
      ...makeOrganization({ id: "org_free", freeForever: true }),
      trial: null,
      subscriptions: [],
    } as never);

    const c = caller({ session });
    await expect(c.subscriptionNoop()).resolves.toEqual({ freeForever: true });
  });

  it("authorizes an active subscription", async () => {
    const session = makeSession({ activeOrganizationId: "org_sub" });
    const subscription = makeSubscription({
      organizationId: "org_sub",
      status: "active",
    });
    dbMock.organization.findFirstOrThrow.mockResolvedValue({
      ...makeOrganization({ id: "org_sub", freeForever: false }),
      trial: null,
      subscriptions: [subscription],
    } as never);

    const c = caller({ session });
    await expect(c.subscriptionNoop()).resolves.toMatchObject({
      id: subscription.id,
    });
  });

  it("authorizes an unexpired trial", async () => {
    const session = makeSession({ activeOrganizationId: "org_trial" });
    const trial = makeTrial({
      endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });
    dbMock.organization.findFirstOrThrow.mockResolvedValue({
      ...makeOrganization({ id: "org_trial", freeForever: false }),
      trial,
      subscriptions: [],
    } as never);

    const c = caller({ session });
    await expect(c.subscriptionNoop()).resolves.toMatchObject({ id: trial.id });
  });

  it("rejects an expired trial with PAYMENT_REQUIRED", async () => {
    const session = makeSession({ activeOrganizationId: "org_old_trial" });
    const trial = makeTrial({
      endsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    dbMock.organization.findFirstOrThrow.mockResolvedValue({
      ...makeOrganization({ id: "org_old_trial", freeForever: false }),
      trial,
      subscriptions: [],
    } as never);

    const c = caller({ session });
    await expect(c.subscriptionNoop()).rejects.toMatchObject({
      code: "PAYMENT_REQUIRED",
    });
  });

  it("falls back to INTERNAL_SERVER_ERROR when neither a sub nor a trial exists", async () => {
    const session = makeSession({ activeOrganizationId: "org_void" });
    dbMock.organization.findFirstOrThrow.mockResolvedValue({
      ...makeOrganization({ id: "org_void", freeForever: false }),
      trial: null,
      subscriptions: [],
    } as never);

    const c = caller({ session });
    await expect(c.subscriptionNoop()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});

// Sanity assertion: the errors we throw are TRPCError instances (so the
// client-side typed error formatter can serialize them).
describe("error type", () => {
  it("throws TRPCError, not plain Error", async () => {
    const c = caller({ session: null });
    try {
      await c.protectedNoop();
      throw new Error("expected protectedNoop to reject");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
    }
  });
});
