import { Document } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { cancelMeteredUsage, recordMeteredUsage } from "@/server/utils/stripe";
import { stripePricingData } from "@/stripe/data";

export async function updateMeteredUsage(documentId: string) {
  try {
    const doc = await db.document.findFirstOrThrow({
      where: { id: documentId },
      include: {
        organization: {
          include: {
            trial: true,
            subscriptions: {
              where: {
                status: { in: ["active", "canceled"] },
              },
            },
          },
        },
      },
    });

    if (doc.organization.freeForever) {
      // nothing to do here
    } else if (doc.organization.subscriptions.length) {
      const subscription = doc.organization.subscriptions[0];
      const eventName = stripePricingData[subscription.plan].meter.event_name;
      const stripeEventIdentifier = await recordMeteredUsage(
        subscription.stripeCustomerId!,
        documentId,
        eventName,
      );
      await db.document.update({
        where: { id: documentId },
        data: { stripeEventIdentifier },
      });
    } else if (doc.organization.trial) {
      await db.trial.update({
        where: { id: doc.organization.trial.id },
        data: { creditsUsed: { increment: 1 } },
      });
    } else {
      throw new Error(
        `Cannot determine how to count usage for document with id '${documentId}'.`,
      );
    }
  } catch (err) {
    console.error(
      `Error processing usage for document with id ${documentId}. Will continue to process without metering.`,
    );
    console.error(err);
  }
}

export async function deductMeteredUsage(doc: Document) {
  if (doc.stripeEventIdentifier) {
    try {
      const subscription = await db.subscription.findFirstOrThrow({
        where: {
          organizationId: doc.organizationId,
          status: { in: ["active", "canceled"] },
        },
      });
      const eventName = stripePricingData[subscription.plan].meter.event_name;
      await cancelMeteredUsage(doc.stripeEventIdentifier, eventName);
    } catch (err) {
      console.error(
        `Error cancelling metered usage for failed document with id ${doc.id}`,
      );
    }
    return;
  }

  const org = await db.organization.findFirstOrThrow({
    where: { id: doc.organizationId },
  });

  if (org.freeForever || !org.trialId) {
    return;
  }
  await db.trial.update({
    where: { id: org?.trialId },
    data: { creditsUsed: { decrement: 1 } },
  });
}
