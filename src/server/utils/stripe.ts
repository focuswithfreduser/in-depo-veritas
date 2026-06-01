import Stripe from "stripe";
import { type Subscription, SubscriptionPlan } from "@/app/generated/prisma";
import { stripePricingData, EventName } from "@/stripe/data";
import { getUnixTime } from "date-fns";
import { createLazyResource } from "@/lib/utils/lazy-resource";

export const stripeClient = createLazyResource(
  () =>
    new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-08-27.basil",
      appInfo: {
        name: "in-depo-veritas",
        url: "https://indepoveritas.com/",
      },
    }),
);

export async function ensureCustomer(email: string): Promise<Stripe.Customer> {
  const customers = await stripeClient.customers.list({
    email,
    limit: 1,
  });
  if (customers.data.length) {
    return customers.data[0];
  }
  return stripeClient.customers.create({
    email,
  });
}

type RedirectBehavior = { success: string; cancel: string };

export async function checkout(
  customer: Stripe.Customer,
  organizationId: string,
  plan: SubscriptionPlan,
  redirectTo: RedirectBehavior,
): Promise<Stripe.Checkout.Session> {
  return stripeClient.checkout.sessions.create({
    customer: customer.id,
    success_url: redirectTo.success,
    cancel_url: redirectTo.cancel,
    mode: "subscription",
    client_reference_id: organizationId,
    subscription_data: {
      metadata: { organizationId },
    },
    metadata: { organizationId },
    line_items: await lineItemsForPlan(plan),
  } as Stripe.Checkout.SessionCreateParams);
}

type SubscriptionWithStripeData<T> = Subscription & {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
} & { status: T };

export async function cancelSubscription(
  subscription: SubscriptionWithStripeData<"active">,
  redirectTo: RedirectBehavior,
): Promise<Stripe.BillingPortal.Session> {
  return stripeClient.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: redirectTo.cancel,
    flow_data: {
      type: "subscription_cancel",
      subscription_cancel: {
        subscription: subscription.stripeSubscriptionId,
      },
      after_completion: {
        redirect: {
          return_url: redirectTo.success,
        },
        type: "redirect",
      },
    },
  });
}

export async function restoreSubscription(
  subscription: SubscriptionWithStripeData<"canceled">,
  redirectTo: RedirectBehavior,
): Promise<{ url: string }> {
  await stripeClient.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });
  return { url: redirectTo.success };
}

export async function recordMeteredUsage(
  stripeCustomerId: string,
  documentId: string | undefined,
  eventName: EventName,
) {
  const { identifier } = await stripeClient.billing.meterEvents.create(
    {
      event_name: eventName,
      payload: {
        value: "1",
        stripe_customer_id: stripeCustomerId,
      },
      identifier: documentId,
    },
    {
      idempotencyKey: documentId,
    },
  );
  return identifier;
}

export async function cancelMeteredUsage(
  identifier: string,
  eventName: EventName,
) {
  return stripeClient.billing.meterEventAdjustments.create(
    {
      event_name: eventName,
      type: "cancel",
      cancel: { identifier },
    },
    {
      idempotencyKey: identifier,
    },
  );
}

export async function getMeter(
  plan: SubscriptionPlan,
): Promise<Stripe.Billing.Meter> {
  const existingMeters = await stripeClient.billing.meters.list();
  const eventName = stripePricingData[plan].meter.event_name;
  const meter = existingMeters.data.find((m) => m.event_name === eventName);
  if (!meter) {
    throw new Error(`Unable to find meter for event name '${eventName}'`);
  }
  return meter;
}

export async function getMeteredUsage(
  meterId: string,
  customerId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const meterEventSummaries =
    await stripeClient.billing.meters.listEventSummaries(meterId, {
      customer: customerId,
      start_time: getUnixTime(from),
      end_time: getUnixTime(to),
    });
  return meterEventSummaries.data[0]?.aggregated_value || 0;
}

export async function getSubscriptionItem(
  subscriptionId: string,
): Promise<Stripe.SubscriptionItem> {
  const {
    items: { data },
  } = await stripeClient.subscriptions.retrieve(subscriptionId);
  return data[0];
}

export async function constructWebhookEvent(
  payload: string,
  header: string,
  secret: string,
): Promise<Stripe.Event> {
  return stripeClient.webhooks.constructEvent(payload, header, secret);
}

type AdHocPriceDefinition =
  | { lookupKey: string; quantity?: number }
  | { price: string; quantity?: number };

async function lineItemsForPlan(
  plan: SubscriptionPlan,
): Promise<Stripe.Checkout.SessionCreateParams.LineItem[]> {
  const pricingModel = stripePricingData[plan].prices;
  const data: AdHocPriceDefinition[] = [
    {
      lookupKey: pricingModel.base.lookup_key,
      quantity: 1,
    },
    {
      lookupKey: pricingModel.overage.lookup_key,
    },
  ];

  return await Promise.all(data.map((i) => resolveLineItem(i)));
}

async function resolveLineItem(
  item: AdHocPriceDefinition,
): Promise<Stripe.Checkout.SessionCreateParams.LineItem> {
  if ("price" in item) {
    return { price: item.price, quantity: item.quantity };
  }

  const prices = await stripeClient.prices.list({
    lookup_keys: [item.lookupKey],
    active: true,
    limit: 1,
  });

  if (!prices.data.length) {
    throw new Error(
      `No price with lookupKey ${item.lookupKey} could be found.`,
    );
  }

  return {
    price: prices.data[0].id,
    quantity: item.quantity,
  };
}
