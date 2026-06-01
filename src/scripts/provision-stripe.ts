#!/usr/bin/env -S npx tsx

import { Stripe } from "stripe";
import { stripeClient } from "@/server/utils/stripe";
import {
  stripePricingData,
  stripeBillingPortalConfiguration,
} from "./../stripe/data";

(async () => {
  if (process.env.NEXT_RUNTIME) {
    throw new Error(
      "This script should never be called from within the Next.js application.",
    );
  }

  {
    let response = await stripeClient.billingPortal.configurations.list({
      limit: 1,
    });
    let [configuration] = response.data;
    if (configuration) {
      configuration = await stripeClient.billingPortal.configurations.update(
        configuration.id,
        stripeBillingPortalConfiguration,
      );
      console.log(
        "Found existing billing portal configuration, which will be updated.",
      );
    } else {
      configuration = await stripeClient.billingPortal.configurations.create(
        stripeBillingPortalConfiguration,
      );
      console.log(
        "No existing billing portal configuration was found, created a new one.",
      );
    }
    console.log(configuration);
  }

  for (const plan of Object.values(stripePricingData)) {
    const {
      product: productConfig,
      prices: pricesConfig,
      meter: meterConfig,
    } = plan;

    let requiresNewPrices = false;
    let product: Stripe.Product | undefined;
    {
      let products = await allPages<Stripe.Product>((p) =>
        stripeClient.products.list(p),
      )();
      product = products.find((p) => p.name === productConfig.name);
      if (!product) {
        product = await stripeClient.products.create({
          name: productConfig.name,
        });
        console.log("No existing product found, created a new one.");
        requiresNewPrices = true;
      } else {
        console.log(
          `Found existing product with name '${productConfig.name}', skipping creation.`,
        );
      }
    }
    console.log(product);

    let meter: Stripe.Billing.Meter | undefined;
    {
      let meters = await allPages<Stripe.Billing.Meter>((p) =>
        stripeClient.billing.meters.list(p),
      )();
      meter = meters.find((m) => m.event_name === meterConfig.event_name);
      if (!meter) {
        meter = await stripeClient.billing.meters.create(meterConfig);
        console.log("No existing meter found, created a new one.");
      } else {
        console.log(
          `Found existing meter with a matching event_name '${meterConfig.event_name}', skipping creation.`,
        );
      }
    }
    console.log(meter);

    {
      let prices = await allPages<Stripe.Price>((p) =>
        stripeClient.prices.list(p),
      )();
      let basePrice = prices.find(
        (p) => p.lookup_key === pricesConfig.base.lookup_key,
      );
      if (basePrice && requiresNewPrices) {
        throw new Error(
          `Found a base price that matches the configured lookup key, but need to create a new one. Update the lookup key, so a new price can be created.`,
        );
      }
      if (!basePrice) {
        const creationParams = {
          ...pricesConfig.base,
          product: product.id,
        };
        basePrice = await stripeClient.prices.create(creationParams);
      } else {
        console.log(
          `Found existing base price with lookup key '${pricesConfig.base.lookup_key}'`,
        );
      }
      console.log(basePrice);

      let overagePrice = prices.find(
        (p) => p.lookup_key === pricesConfig.overage.lookup_key,
      );
      if (overagePrice && requiresNewPrices) {
        throw new Error(
          `Found an overage price that matches the configured lookup key, but need to create a new one. Update the lookup key, so a new price can be created.`,
        );
      }
      if (!overagePrice || requiresNewPrices) {
        const creationParams = {
          ...pricesConfig.overage,
          product: product.id,
          recurring: {
            ...pricesConfig.overage.recurring,
            meter: meter.id,
          },
        };
        overagePrice = await stripeClient.prices.create(creationParams);
      } else {
        console.log(
          `Found existing overage price with lookup key '${pricesConfig.overage.lookup_key}'`,
        );
      }
      console.log(overagePrice);
    }
  }
})()
  .then(() => {
    console.log("Script finished.");
  })
  .catch((err) => {
    console.error("The script encountered an error:");
    console.error(err);
    process.exitCode = 1;
  });

function allPages<T extends { id: string }>(
  pagerFn: (args: {
    limit: number;
    starting_after: string | undefined;
  }) => Stripe.ApiListPromise<T>,
): () => Promise<T[]> {
  return async function () {
    let startingAfter: string | undefined = undefined;
    let objects: T[] = [];
    while (true) {
      const response = await pagerFn({
        limit: 100,
        starting_after: startingAfter,
      });
      objects = [...objects, ...response.data];
      if (!response.has_more) {
        break;
      }
      startingAfter = response.data[response.data.length - 1].id;
    }
    return objects;
  };
}
