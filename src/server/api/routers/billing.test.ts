import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildCaller } from "@/test/trpc-caller";
import { dbMock } from "@/test/mocks/db";
import { makeOrganization, makeSession, makeTrial } from "@/test/factories";

// The DISCOUNT_CODES env var is read at module init by t3-oss/env. The
// test setup forces SKIP_ENV_VALIDATION=1, so we set the raw process.env
// before importing the router. Tests below override per-case via vi.stubEnv.

vi.mock("@/server/utils/stripe", () => ({
  cancelSubscription: vi.fn(),
  restoreSubscription: vi.fn(),
  checkout: vi.fn(),
  ensureCustomer: vi.fn(),
  getMeter: vi.fn(),
  getMeteredUsage: vi.fn(),
}));

describe("billing.applyDiscountCode", () => {
  function armNotBanned() {
    dbMock.user.findUnique.mockResolvedValue({
      banned: false,
      banExpires: null,
      accessExpiresAt: null,
    } as never);
  }

  beforeEach(() => {
    vi.stubEnv("DISCOUNT_CODES", "");
    vi.stubEnv("USE_TEST_PROVIDERS", "true");
  });

  it("rejects every code when the DISCOUNT_CODES env var is empty (S6)", async () => {
    vi.stubEnv("DISCOUNT_CODES", "");
    armNotBanned();
    const caller = buildCaller({
      session: makeSession({ activeOrganizationId: "org_active" }),
    });
    await expect(
      caller.billing.applyDiscountCode({ code: "JuryBallVegas2025" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts a code listed in DISCOUNT_CODES (case-insensitive) and grants 10 credits to an existing trial", async () => {
    vi.stubEnv("DISCOUNT_CODES", "JuryBallVegas2025,JuryBallFriends");
    armNotBanned();

    const session = makeSession({ activeOrganizationId: "org_active" });
    dbMock.subscription.findFirst.mockResolvedValueOnce(null);
    const trial = makeTrial({ creditsAvailable: 1 });
    dbMock.organization.findFirstOrThrow.mockResolvedValueOnce({
      ...makeOrganization({ id: "org_active" }),
      trial,
      discountCodesApplied: [],
    } as never);
    dbMock.trial.update.mockResolvedValueOnce({} as never);
    dbMock.organization.update.mockResolvedValueOnce({} as never);

    const caller = buildCaller({ session });
    const out = await caller.billing.applyDiscountCode({
      code: "juryballvegas2025", // lowercase — must still match
    });

    expect(out).toMatchObject({ success: true });
    expect(dbMock.trial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ creditsAvailable: 11 }),
      }),
    );
  });

  it("rejects a code that is not in DISCOUNT_CODES", async () => {
    vi.stubEnv("DISCOUNT_CODES", "JuryBallVegas2025");
    armNotBanned();
    const caller = buildCaller({
      session: makeSession({ activeOrganizationId: "org_active" }),
    });
    await expect(
      caller.billing.applyDiscountCode({ code: "NOT_A_REAL_CODE" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
