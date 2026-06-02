import { z } from "zod";
import { createTRPCRouter, protectedOrganizationProcedure } from "../trpc";
import { db } from "@/lib/db";
import {
  cancelSubscription,
  restoreSubscription,
  checkout,
  ensureCustomer,
  getMeter,
  getMeteredUsage,
} from "@/server/utils/stripe";
import { $Enums, Subscription } from "@/app/generated/prisma";
import { TRPCError } from "@trpc/server";

export type UsageStats =
  | { type: "subscription"; used: number; periodStart: Date; periodEnd: Date }
  | { type: "trial"; used: number; available: number; endsAt: Date }
  | { type: "freeForever"; used: number };

/**
 * Valid discount codes are configured via the `DISCOUNT_CODES` env var
 * (comma-separated). Matching is case-insensitive. An empty list disables
 * the discount feature — `billing.applyDiscountCode` will always reject.
 *
 * Reads `process.env` directly (rather than the t3-oss `env` proxy) so that
 * operators can rotate the list without redeploying, and so that tests can
 * use `vi.stubEnv` to drive each scenario. The values are non-sensitive
 * (already shipped to users when they apply a code), so the validated env
 * is overkill here.
 */
const getDiscountCodes = (): string[] => {
  const raw = process.env.DISCOUNT_CODES ?? "";
  return raw
    .split(",")
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
};

export const billingRouter = createTRPCRouter({
  listSubscriptions: protectedOrganizationProcedure.query(async ({ ctx }) => {
    return db.subscription.findMany({
      where: {
        organizationId: ctx.session.session.activeOrganizationId,
      },
    });
  }),
  subscribe: protectedOrganizationProcedure
    .input(
      z.object({
        returnUrl: z.object({
          success: z.url(),
          cancel: z.url(),
        }),
        plan: z.enum($Enums.SubscriptionPlan).default("Professional"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.session.activeOrganizationId;
      const existingSubscriptionCount = await db.subscription.count({
        where: {
          organizationId,
          status: {
            in: ["active", "canceled"],
          },
        },
      });
      if (existingSubscriptionCount !== 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Organization currently has an active subscription, cannot subscribe again.",
        });
      }

      return checkout(
        await ensureCustomer(ctx.session.user.email),
        organizationId,
        input.plan,
        input.returnUrl,
      );
    }),
  unsubscribe: protectedOrganizationProcedure
    .input(
      z.object({
        returnUrl: z.object({
          success: z.url(),
          cancel: z.url(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const match = (await db.subscription.findFirstOrThrow({
        where: {
          status: "active",
          organizationId: ctx.session.session.activeOrganizationId,
        },
      })) as Subscription & {
        status: "active";
        stripeCustomerId: string;
        stripeSubscriptionId: string;
      };
      // Stripe data is present due to enforcing a CHECK constraint
      return cancelSubscription(match, input.returnUrl);
    }),
  restoreSubscription: protectedOrganizationProcedure
    .input(
      z.object({
        returnUrl: z.object({
          success: z.url(),
          cancel: z.url(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const match = (await db.subscription.findFirstOrThrow({
        where: {
          status: "canceled",
          organizationId: ctx.session.session.activeOrganizationId,
        },
      })) as Subscription & { status: "canceled" };
      return restoreSubscription(match, input.returnUrl);
    }),
  usage: protectedOrganizationProcedure
    .input(
      z.object({
        live: z.boolean().default(false),
      }),
    )
    .query<UsageStats>(async ({ input, ctx }) => {
      const organization = await db.organization.findFirstOrThrow({
        where: {
          id: ctx.session.session.activeOrganizationId,
        },
        include: {
          trial: true,
        },
      });
      if (organization.freeForever) {
        const used = await db.document.count({
          where: {
            organizationId: organization.id,
            status: "complete",
          },
        });
        return { type: "freeForever", used };
      }

      const subscription = await db.subscription.findFirst({
        where: {
          organizationId: ctx.session.session.activeOrganizationId,
          status: {
            in: ["active", "canceled"],
          },
        },
      });

      if (subscription) {
        let numDocs: number;
        if (input.live) {
          const meter = await getMeter(subscription.plan);
          numDocs = await getMeteredUsage(
            meter.id,
            subscription.stripeCustomerId,
            subscription.periodStart,
            subscription.periodEnd,
          );
        } else {
          numDocs = await db.document.count({
            where: {
              organizationId: subscription.organizationId,
              stripeEventIdentifier: { not: null },
              createdAt: {
                gte: subscription.periodStart,
                lte: subscription.periodEnd,
              },
              status: "complete",
            },
          });
        }

        return {
          type: "subscription",
          used: numDocs,
          periodStart: subscription.periodStart,
          periodEnd: subscription.periodEnd,
        };
      }

      if (organization.trial) {
        return {
          type: "trial",
          used: organization.trial.creditsUsed,
          available: organization.trial.creditsAvailable,
          endsAt: organization.trial.endsAt,
        };
      }

      // TODO: Remove this code branch once the Organization -> Trial
      // relation is not nullable anymore.
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error inferring authorization for organization '${organization.id}'. Have all migrations been applied?`,
      });
    }),
  applyDiscountCode: protectedOrganizationProcedure
    .input(
      z.object({
        code: z.string().min(1, "Discount code is required"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Normalize the input code: trim whitespace and convert to lowercase
      const normalizedInputCode = input.code.trim().toLowerCase();

      // Check if the discount code is valid (case-insensitive)
      const matchedCode = getDiscountCodes().find(
        (code) => code.toLowerCase() === normalizedInputCode,
      );

      if (!matchedCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid discount code",
        });
      }

      const organizationId = ctx.session.session.activeOrganizationId;

      // Check if organization already has an active subscription
      const activeSubscription = await db.subscription.findFirst({
        where: {
          organizationId,
          status: "active",
        },
      });

      if (activeSubscription) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot apply discount code to organizations with active subscriptions",
        });
      }

      const organization = await db.organization.findFirstOrThrow({
        where: {
          id: organizationId,
        },
        include: {
          trial: true,
        },
      });

      // Check if this discount code has already been applied (case-insensitive)
      const hasAlreadyApplied = organization.discountCodesApplied.some(
        (appliedCode) => appliedCode.toLowerCase() === normalizedInputCode,
      );

      if (hasAlreadyApplied) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This discount code has already been applied to your organization",
        });
      }

      const now = new Date();
      const oneMonthFromNow = new Date(now);
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      if (organization.trial) {
        // Extend existing trial by 1 month and add 10 credits
        const extendedEndDate = new Date(organization.trial.endsAt);
        extendedEndDate.setMonth(extendedEndDate.getMonth() + 1);

        await db.trial.update({
          where: {
            id: organization.trial.id,
          },
          data: {
            endsAt: extendedEndDate,
            creditsAvailable: organization.trial.creditsAvailable + 10,
          },
        });
      } else {
        // Create new trial with 1 month duration and 10 credits (plus the default 1)
        const newTrial = await db.trial.create({
          data: {
            endsAt: oneMonthFromNow,
            creditsAvailable: 11, // 1 default + 10 from discount
          },
        });

        await db.organization.update({
          where: {
            id: organizationId,
          },
          data: {
            trialId: newTrial.id,
          },
        });
      }

      // Track that this discount code has been applied (store the canonical form)
      await db.organization.update({
        where: {
          id: organizationId,
        },
        data: {
          discountCodesApplied: {
            push: matchedCode,
          },
        },
      });

      return {
        success: true,
        message: "Congratulations! You've received 10 free depositions!",
      };
    }),
});
