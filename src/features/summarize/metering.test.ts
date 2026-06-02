import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deductMeteredUsage,
  updateMeteredUsage,
} from "@/features/summarize/metering";
import {
  cancelMeteredUsage,
  recordMeteredUsage,
} from "@/server/utils/stripe";
import { dbMock } from "@/test/mocks/db";
import {
  makeDocument,
  makeOrganization,
  makeSubscription,
  makeTrial,
} from "@/test/factories";

beforeEach(() => {
  // Silence the errors metering.ts logs in its catch blocks.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("updateMeteredUsage", () => {
  it("does nothing for a freeForever organization", async () => {
    const doc = makeDocument();
    dbMock.document.findFirstOrThrow.mockResolvedValue({
      ...doc,
      organization: {
        ...makeOrganization({ freeForever: true }),
        trial: null,
        subscriptions: [],
      },
    } as never);

    await updateMeteredUsage(doc.id);

    expect(recordMeteredUsage).not.toHaveBeenCalled();
    expect(dbMock.document.update).not.toHaveBeenCalled();
    expect(dbMock.trial.update).not.toHaveBeenCalled();
  });

  it("records Stripe usage for an active subscription and stamps the identifier on the doc", async () => {
    const doc = makeDocument();
    const subscription = makeSubscription({
      plan: "Professional",
      stripeCustomerId: "cus_xyz",
    });
    dbMock.document.findFirstOrThrow.mockResolvedValue({
      ...doc,
      organization: {
        ...makeOrganization({ freeForever: false }),
        trial: null,
        subscriptions: [subscription],
      },
    } as never);
    vi.mocked(recordMeteredUsage).mockResolvedValue(
      "stripe_event_abc" as never,
    );

    await updateMeteredUsage(doc.id);

    expect(recordMeteredUsage).toHaveBeenCalledWith(
      "cus_xyz",
      doc.id,
      "document_summarized",
    );
    expect(dbMock.document.update).toHaveBeenCalledWith({
      where: { id: doc.id },
      data: { stripeEventIdentifier: "stripe_event_abc" },
    });
  });

  it("increments trial.creditsUsed when the org is on a trial", async () => {
    const doc = makeDocument();
    const trial = makeTrial();
    dbMock.document.findFirstOrThrow.mockResolvedValue({
      ...doc,
      organization: {
        ...makeOrganization({ freeForever: false }),
        trial,
        subscriptions: [],
      },
    } as never);

    await updateMeteredUsage(doc.id);

    expect(dbMock.trial.update).toHaveBeenCalledWith({
      where: { id: trial.id },
      data: { creditsUsed: { increment: 1 } },
    });
    expect(recordMeteredUsage).not.toHaveBeenCalled();
  });

  it("swallows errors so summary processing continues", async () => {
    dbMock.document.findFirstOrThrow.mockRejectedValue(new Error("db down"));
    // Should not throw.
    await expect(updateMeteredUsage("doc_x")).resolves.toBeUndefined();
  });
});

describe("deductMeteredUsage", () => {
  it("cancels Stripe usage when the document has a stripeEventIdentifier", async () => {
    const doc = makeDocument({ stripeEventIdentifier: "stripe_event_abc" });
    dbMock.subscription.findFirstOrThrow.mockResolvedValue(
      makeSubscription({ plan: "Professional" }) as never,
    );

    await deductMeteredUsage(doc);

    expect(cancelMeteredUsage).toHaveBeenCalledWith(
      "stripe_event_abc",
      "document_summarized",
    );
    expect(dbMock.trial.update).not.toHaveBeenCalled();
  });

  it("does not touch the trial for a freeForever org", async () => {
    const doc = makeDocument({ stripeEventIdentifier: null });
    dbMock.organization.findFirstOrThrow.mockResolvedValue(
      makeOrganization({ freeForever: true }) as never,
    );

    await deductMeteredUsage(doc);

    expect(dbMock.trial.update).not.toHaveBeenCalled();
    expect(cancelMeteredUsage).not.toHaveBeenCalled();
  });

  it("decrements trial.creditsUsed when there is no Stripe event and the org has a trial", async () => {
    const doc = makeDocument({ stripeEventIdentifier: null });
    dbMock.organization.findFirstOrThrow.mockResolvedValue(
      makeOrganization({ freeForever: false, trialId: "trial_99" }) as never,
    );

    await deductMeteredUsage(doc);

    expect(dbMock.trial.update).toHaveBeenCalledWith({
      where: { id: "trial_99" },
      data: { creditsUsed: { decrement: 1 } },
    });
  });
});
