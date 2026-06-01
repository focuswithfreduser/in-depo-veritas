import type { Stripe } from "stripe";
import { fromUnixTime, isEqual } from "date-fns";

import { NextResponse } from "next/server";
import {
  getSubscriptionItem,
  constructWebhookEvent,
} from "@/server/utils/stripe";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  let event: Stripe.Event;

  try {
    event = await constructWebhookEvent(
      await (await req.blob()).text(),
      req.headers.get("stripe-signature") as string,
      process.env.STRIPE_WEBHOOK_SIGNING_SECRET!,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    if (err! instanceof Error) {
      console.log(err);
    }
    console.log(`❌ Error message: ${errorMessage}`);
    return NextResponse.json(
      { message: `Webhook Error: ${errorMessage}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const organizationId = event.data.object.metadata?.organizationId;
        if (!organizationId) {
          throw new Error(
            "Unable to map checkout session without a subscriptionId in its metadata.",
          );
        }

        const stripeSubscriptionId = event.data.object.subscription as string;
        const subscriptionItem =
          await getSubscriptionItem(stripeSubscriptionId);
        const periodStart = fromUnixTime(subscriptionItem.current_period_start);
        const periodEnd = fromUnixTime(subscriptionItem.current_period_end);
        const stripeCustomerId = event.data.object.customer as string;

        // Stripe might send the same event twice, so this is using an
        // upsert in order to ensure a nice 20x response.
        const record = await db.subscription.upsert({
          where: { stripeSubscriptionId },
          create: {
            stripeSubscriptionId,
            status: "active",
            stripeCustomerId,
            periodStart,
            periodEnd,
            organizationId,
          },
          update: {
            status: "active",
            stripeCustomerId,
            periodStart,
            periodEnd,
            organizationId,
          },
        });

        return NextResponse.json(
          { ok: true },
          { status: isEqual(record.createdAt, record.updatedAt) ? 201 : 200 },
        );
      }

      case "customer.subscription.updated": {
        const subscriptionItem = await getSubscriptionItem(
          event.data.object.id,
        );
        const periodStart = fromUnixTime(subscriptionItem.current_period_start);
        const periodEnd = fromUnixTime(subscriptionItem.current_period_end);

        switch (event.data.object.status) {
          case "incomplete":
          case "incomplete_expired":
          case "paused":
          case "trialing":
            // These cases are not covered by the application's
            // subscription logic and should theoretically
            // never be sent by Stripe.
            return NextResponse.json({ ok: false }, { status: 501 });
          case "past_due":
            await db.subscription.update({
              where: {
                stripeSubscriptionId: event.data.object.id,
              },
              data: {
                periodStart,
                periodEnd,
                pastDue: true,
              },
            });
            // TODO: figure out what else to do here?
            return NextResponse.json({ ok: true });
          case "unpaid":
          case "canceled":
            await db.subscription.update({
              where: {
                stripeSubscriptionId: event.data.object.id,
              },
              data: {
                periodStart,
                periodEnd,
                status: "retired",
                retirementReason: "unpaid",
              },
            });
            return NextResponse.json({ ok: true });
          case "active":
            await db.subscription.update({
              where: {
                stripeSubscriptionId: event.data.object.id,
              },
              data: {
                periodStart,
                periodEnd,
                pastDue: false,
                status: event.data.object.cancel_at_period_end
                  ? "canceled"
                  : "active",
              },
            });
            return NextResponse.json({ ok: true });
          default:
            const exhaustiveCheck: never = event.data.object.status;
            return NextResponse.json({ ok: false }, { status: 500 });
        }
      }

      case "customer.subscription.deleted": {
        await db.subscription.update({
          where: {
            stripeSubscriptionId: event.data.object.id,
          },
          data: {
            status: "retired",
            retirementReason: "canceled",
          },
        });
        return NextResponse.json({ ok: true });
      }

      default:
        console.log(
          `Received event '${event.type}' from Stripe, but no handler was defined.`,
        );
        return NextResponse.json({ ok: true });
    }
  } catch (err: any) {
    console.error(
      `An error occured handling an event from Stripe: ${err.message}`,
    );
    console.error(err);
    console.error(event);
    throw err;
  }
}
