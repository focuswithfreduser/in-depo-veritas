import { TRPCError } from "@trpc/server";
import { addDays } from "date-fns";

import { db } from "@/lib/db";
import { getEmailData } from "@/lib/utils/email";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  ORGANIZATION_FREE_TRIAL_CREDITS,
  ORGANIZATION_FREE_TRIAL_DAYS,
} from "@/server/utils/organization-defaults";

export const meRouter = createTRPCRouter({
  get: protectedProcedure.query(async (opts) => {
    const ctx = opts.ctx;

    const user = await db.user.findFirstOrThrow({
      where: {
        id: ctx.session.user.id,
      },
    });
    const isAdminImpersonated = !!ctx.session.session?.impersonatedBy;

    // Get all organizations the user is a member of
    const memberships = await db.member.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        organization: true,
      },
    });

    const userOrganizations = memberships.map((m) => m.organization);

    // Get pending invitations for this user
    const pendingInvitations = await db.invitation.findMany({
      where: {
        email: ctx.session.user.email,
        status: "pending",
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        organization: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!ctx.session.session?.activeOrganizationId) {
      const email = ctx.session.user.email;
      const emailData = email ? getEmailData(email) : null;
      const myDomain = emailData?.type === "private" ? emailData.domain : null;
      if (!myDomain) {
        return {
          ...user,
          organization: null,
          availableOrganizations: [],
          userOrganizations,
          pendingInvitations,
          isAdminImpersonated,
        };
      }

      const availableOrganizations = await db.organization.findMany({
        where: {
          domains: { some: { domain: myDomain } },
        },
      });
      return {
        ...user,
        organization: null,
        availableOrganizations,
        userOrganizations,
        pendingInvitations,
        isAdminImpersonated,
      };
    }

    const organization = await db.organization.findFirstOrThrow({
      where: {
        id: ctx.session.session?.activeOrganizationId,
      },
    });

    return {
      ...user,
      organization,
      availableOrganizations: [organization],
      userOrganizations,
      pendingInvitations,
      isAdminImpersonated,
    };
  }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        firstName: z.string().optional(),
        workspaceName: z.string(),
        // NOTE: `joinExistingOrganizationId` was removed in Phase 3. The
        // previous behaviour let any user with a matching email domain
        // auto-join a registered organisation with no invitation or approval
        // (review S9). Joining an existing org now happens exclusively
        // through the explicit Invitation flow (see `organization.invite` +
        // `organization.acceptInvitation`).
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = ctx.session.user.email;
      const emailData = email ? getEmailData(email) : null;
      const myDomain = emailData?.type === "private" ? emailData.domain : null;

      const activeOrganizationId = ctx.session.session?.activeOrganizationId;

      // Reusable user-field update (avoids the previous duplicated blocks).
      const applyUserFieldUpdates = async () => {
        const updateUserData: Partial<{ name: string; firstName: string }> = {};
        if (input.name) updateUserData.name = input.name;
        if (input.firstName) updateUserData.firstName = input.firstName;
        if (Object.keys(updateUserData).length > 0) {
          await db.user.update({
            where: { id: ctx.session.user.id },
            data: updateUserData,
          });
        }
      };

      // If user has an organization, just update the name + user fields
      if (activeOrganizationId) {
        await db.organization.update({
          where: { id: activeOrganizationId },
          data: { name: input.workspaceName },
        });
        await applyUserFieldUpdates();
        return { success: true, organizationId: activeOrganizationId };
      }

      // If user doesn't have an organization and is creating a new one
      const newOrganization = await db.organization.create({
        data: {
          name: input.workspaceName,
          trial: {
            create: {
              endsAt: addDays(new Date(), ORGANIZATION_FREE_TRIAL_DAYS),
              creditsAvailable: ORGANIZATION_FREE_TRIAL_CREDITS,
            },
          },
        },
      });

      // Create membership for the user
      await db.member.create({
        data: {
          organizationId: newOrganization.id,
          userId: ctx.session.user.id,
          role: "owner", // Assuming the creator is the owner
        },
      });

      // Claim the email domain only if no existing org already owns it.
      if (myDomain) {
        const existingOrgWithDomain = await db.organization.findFirst({
          where: {
            domains: { some: { domain: myDomain } },
          },
        });

        // Only add domain if no existing org has this domain
        if (!existingOrgWithDomain) {
          await db.domain.create({
            data: {
              organizationId: newOrganization.id,
              domain: myDomain,
              updatedAt: new Date(),
            },
          });
        }
      }

      // Update the session to set active organization
      await db.session.update({
        where: { id: ctx.session.session!.id },
        data: { activeOrganizationId: newOrganization.id },
      });

      await applyUserFieldUpdates();

      return { success: true, organizationId: newOrganization.id };
    }),

  updateEmailPreferences: protectedProcedure
    .input(
      z.object({
        productUpdates: z.boolean(),
        marketingEmails: z.boolean(),
        shouldEmailOnComplete: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          shouldEmailOnComplete: input.shouldEmailOnComplete,
          productUpdates: input.productUpdates,
          marketingEmails: input.marketingEmails,
        },
      });

      return user;
    }),
});
