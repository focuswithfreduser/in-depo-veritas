import { Stripe } from "stripe";
import { type SubscriptionPlan } from "@/app/generated/prisma";

type PricingDefintion = Omit<Stripe.PriceCreateParams, "product"> & {
  lookup_key: string;
  recurring: { interval: "month" };
};

export type EventName = "document_summarized";

type StripePricingModel = {
  product: Stripe.ProductCreateParams;
  meter: Stripe.Billing.MeterCreateParams & { event_name: EventName };
  prices: {
    base: PricingDefintion;
    overage: PricingDefintion;
  };
};

export const stripePricingData: Record<SubscriptionPlan, StripePricingModel> = {
  Professional: {
    product: {
      name: "In Depo Veritas - Essential Plan Subscription",
    },
    meter: {
      event_name: "document_summarized",
      display_name: "Documents summarized",
      default_aggregation: {
        formula: "sum",
      },
    },
    prices: {
      base: {
        currency: "USD",
        lookup_key: "professional_base_price_v1",
        recurring: {
          interval: "month",
        },
        unit_amount_decimal: "4995",
      },
      overage: {
        currency: "USD",
        lookup_key: "professional_overage_price_v1",
        recurring: {
          interval: "month",
          usage_type: "metered",
        },
        billing_scheme: "tiered",
        tiers_mode: "graduated",
        tiers: [
          { up_to: 10, flat_amount_decimal: "0", unit_amount_decimal: "0" },
          {
            up_to: "inf",
            flat_amount_decimal: "0",
            unit_amount_decimal: "495",
          },
        ],
      },
    },
  },
} as const;

export const stripeBillingPortalConfiguration: Stripe.BillingPortal.ConfigurationCreateParams =
  {
    features: {
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        proration_behavior: "none",
      },
    },
  };
