#!/usr/bin/env -S npx tsx

import Stripe from "stripe";
import { isEqual, fromUnixTime } from "date-fns";

import { stripeClient } from "@/server/utils/stripe";
import { db } from "@/lib/db";
import { Subscription } from "@/app/generated/prisma";

type ActiveSubscription = Subscription & {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: "active" | "canceled";
  periodStart: Date;
  periodEnd: Date;
};

type Mismatch =
  // the first case represents a failure where entries are present in both databases
  // but the data contained in each does not match
  | {
      stripeSubscriptionId: string;
      localSubscriptionId: string;
      mismatches: string[];
    }
  // the second case represents a case where a subscription is only known to the app
  | { stripeSubscriptionId: null; localSubscriptionId: string }
  // the thirs case represents a case where a subscription is only known to Stripe
  | { stripeSubscriptionId: string; localSubscriptionId: null };

// An Issue returns true in case the given arguments do not satisfy the expectations
// and should be considered a mismatch
type Issue = (x: Stripe.Subscription, y: ActiveSubscription) => boolean;

const CHECKS: Record<string, Issue> = {
  "customer id does not match": (x, y) =>
    (x.customer as string) !== y.stripeCustomerId,
  "cancellation status does not match": (x, y) => {
    if (y.status === "canceled") {
      return x.cancel_at_period_end !== true;
    }
    return x.cancel_at_period_end !== false;
  },
  "period start does not match": (x, y) =>
    !isEqual(fromUnixTime(x.items.data[0].current_period_start), y.periodStart),
  "period end does not match": (x, y) =>
    !isEqual(fromUnixTime(x.items.data[0].current_period_end), y.periodEnd),
};

(async () => {
  let mismatches: Mismatch[] = [];

  let allStripeSubscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;
  while (true) {
    const response = await stripeClient.subscriptions.list({
      starting_after: startingAfter,
    });
    allStripeSubscriptions = [...allStripeSubscriptions, ...response.data];
    if (!response.has_more) {
      break;
    }
    startingAfter = response.data[response.data.length - 1].id;
  }

  const stripeSubscriptionsById = allStripeSubscriptions.reduce(
    (acc, next) => {
      acc[next.id] = next;
      return acc;
    },
    {} as Record<string, Stripe.Subscription>,
  );

  const localSubscriptions = (await db.subscription.findMany({
    where: { status: { in: ["active", "canceled"] } },
  })) as ActiveSubscription[];

  // First, retrieve all running subscriptions known to the application
  // and check whether they have a counterpart in Stripe. In case they do,
  // check whether all defined checks pass.

  for (const localSubscription of localSubscriptions) {
    let stripeSubscription =
      stripeSubscriptionsById[localSubscription.stripeSubscriptionId];
    if (!stripeSubscription) {
      mismatches = [
        ...mismatches,
        {
          localSubscriptionId: localSubscription.id,
          stripeSubscriptionId: null,
        },
      ];
      break;
    }

    let failed: string[] = [];
    for (const [key, issue] of Object.entries(CHECKS)) {
      if (issue(stripeSubscription, localSubscription)) {
        failed.push(key);
      }
    }
    if (failed.length) {
      mismatches = [
        ...mismatches,
        {
          localSubscriptionId: localSubscription.id,
          stripeSubscriptionId: stripeSubscription.id,
          mismatches: failed,
        },
      ];
    }
  }

  // Before finishing, look up all subscriptions known to Stripe, so
  // we can check if there are subscriptions that exist in Stripe only.
  // At this stage, there is no more need to look at the data itself.

  for (const stripeSubscription of allStripeSubscriptions) {
    const match = localSubscriptions.find(
      (ls) => ls.stripeSubscriptionId === stripeSubscription.id,
    );
    if (!match) {
      mismatches = [
        ...mismatches,
        {
          stripeSubscriptionId: stripeSubscription.id,
          localSubscriptionId: null,
        },
      ];
    }
  }

  return mismatches;
})()
  .then((mismatches: Mismatch[]) => {
    if (!mismatches.length) {
      console.log(
        "Database state is in sync with Stripe, no mismatches could be found.",
      );
      return;
    }

    console.log(
      `Database state is out of sync with Stripe, found ${mismatches.length} mismatch(es):`,
    );
    for (const mismatch of mismatches) {
      if (!mismatch.stripeSubscriptionId) {
        console.log(
          `- Local subscription '${mismatch.localSubscriptionId}' has no counterpart in Stripe.`,
        );
      } else if (!mismatch.localSubscriptionId) {
        console.log(
          `- Stripe subscription '${mismatch.stripeSubscriptionId}' has no local counterpart.`,
        );
      } else {
        console.log(
          `- Stripe subscription '${mismatch.stripeSubscriptionId}' did not match local subscription '${mismatch.localSubscriptionId}'`,
        );
        console.log(
          `  The following issues were raised: ${mismatch.mismatches.join(
            ", ",
          )}`,
        );
      }
    }
    process.exitCode = 1;
  })
  .catch((err) => {
    console.error("Running the script encountered an error");
    console.error(err);
    process.exitCode = 1;
  });
