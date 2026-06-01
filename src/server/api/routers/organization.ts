import {
  createTRPCRouter,
  protectedOrganizationProcedure,
  protectedProcedure,
} from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { addDays } from "date-fns";
import { sendEmail } from "@/services/email/resend";
import { getTeamInvitationEmailParams } from "@/emails/user/team-invitation";
import { env } from "@/create-env.mjs";
import { formatEmail } from "@/lib/utils";

export const organizationRouter = createTRPCRouter({
  listTeamMembers: protectedOrganizationProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.session.activeOrganizationId;

    // Get all members of the organization
    const members = await ctx.db.member.findMany({
      where: {
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Get all pending invitations for the organization
    const invitations = await ctx.db.invitation.findMany({
      where: {
        organizationId,
        status: "pending",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Combine members and invitations
    const teamMembers = members.map((member) => ({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      status: "active" as const,
      createdAt: member.createdAt,
    }));

    const pendingInvites = invitations.map((invite) => ({
      id: invite.id,
      userId: null,
      name: null,
      email: invite.email,
      image: null,
      role: invite.role || "member",
      status: "pending" as const,
      createdAt: invite.createdAt,
      invitedBy: invite.user.name,
      expiresAt: invite.expiresAt,
    }));

    return [...teamMembers, ...pendingInvites];
  }),

  inviteTeamMember: protectedOrganizationProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.session.activeOrganizationId;
      const email = formatEmail(input.email);

      // Get organization details
      const organization = await ctx.db.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Check if user is already a member
      const existingMember = await ctx.db.member.findFirst({
        where: {
          organizationId,
          user: {
            email,
          },
        },
      });

      if (existingMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already a member of this organization",
        });
      }

      // Check if there's already a pending invitation
      const existingInvitation = await ctx.db.invitation.findFirst({
        where: {
          organizationId,
          email,
          status: "pending",
        },
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An invitation has already been sent to this email",
        });
      }

      // Create invitation
      const invitation = await ctx.db.invitation.create({
        data: {
          organizationId,
          email,
          role: "member",
          status: "pending",
          expiresAt: addDays(new Date(), 7), // Invitation expires in 7 days
          inviterId: ctx.session.user.id,
        },
      });

      // Send invitation email
      const inviteUrl = `${env.NEXT_PUBLIC_DEPLOYMENT_URL}/app`;
      const emailParams = await getTeamInvitationEmailParams(
        email,
        ctx.session.user.name,
        organization.name,
        inviteUrl,
      );

      await sendEmail(
        emailParams.to as string,
        emailParams.from,
        emailParams.subject,
        emailParams.html,
        emailParams.text,
        null,
        emailParams.replyTo,
      );

      return { success: true, invitationId: invitation.id };
    }),

  removeInvitation: protectedOrganizationProcedure
    .input(
      z.object({
        invitationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.session.activeOrganizationId;

      // Verify the invitation belongs to this organization
      const invitation = await ctx.db.invitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Delete the invitation
      await ctx.db.invitation.delete({
        where: {
          id: input.invitationId,
        },
      });

      return { success: true };
    }),

  removeMember: protectedOrganizationProcedure
    .input(
      z.object({
        memberId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.session.activeOrganizationId;

      // Get the member to remove
      const member = await ctx.db.member.findFirst({
        where: {
          id: input.memberId,
          organizationId,
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Prevent removing yourself
      if (member.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself from the organization",
        });
      }

      // Delete the member
      await ctx.db.member.delete({
        where: {
          id: input.memberId,
        },
      });

      return { success: true };
    }),

  updateName: protectedOrganizationProcedure
    .input(
      z.object({
        name: z.string().min(1, "Organization name is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.session.activeOrganizationId;

      await ctx.db.organization.update({
        where: { id: organizationId },
        data: { name: input.name },
      });

      return { success: true };
    }),

  switchOrganization: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a member of the organization
      const membership = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      // Update the session's active organization
      await ctx.db.session.update({
        where: { id: ctx.session.session!.id },
        data: { activeOrganizationId: input.organizationId },
      });

      return { success: true };
    }),

  createOrganization: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Organization name is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create new organization
      const newOrganization = await ctx.db.organization.create({
        data: {
          name: input.name,
          trial: {
            create: {
              endsAt: addDays(new Date(), 14),
              creditsAvailable: 1,
            },
          },
        },
      });

      // Create membership for the user as owner
      await ctx.db.member.create({
        data: {
          organizationId: newOrganization.id,
          userId: ctx.session.user.id,
          role: "owner",
        },
      });

      // Update the session to set active organization
      await ctx.db.session.update({
        where: { id: ctx.session.session!.id },
        data: { activeOrganizationId: newOrganization.id },
      });

      return { success: true, organizationId: newOrganization.id };
    }),

  acceptInvitation: protectedProcedure
    .input(
      z.object({
        invitationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedSessionEmail = formatEmail(ctx.session.user.email);

      // Get the invitation
      const invitation = await ctx.db.invitation.findFirst({
        where: {
          id: input.invitationId,
          status: "pending",
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      // Compare emails case-insensitively
      if (!invitation || formatEmail(invitation.email) !== normalizedSessionEmail) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found or expired",
        });
      }

      // Check if user is already a member
      const existingMember = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: invitation.organizationId,
        },
      });

      if (existingMember) {
        // Update invitation status and switch to org
        await ctx.db.invitation.update({
          where: { id: input.invitationId },
          data: { status: "accepted" },
        });

        await ctx.db.session.update({
          where: { id: ctx.session.session!.id },
          data: { activeOrganizationId: invitation.organizationId },
        });

        return { success: true, organizationId: invitation.organizationId };
      }

      // Create membership
      await ctx.db.member.create({
        data: {
          organizationId: invitation.organizationId,
          userId: ctx.session.user.id,
          role: invitation.role || "member",
        },
      });

      // Update invitation status
      await ctx.db.invitation.update({
        where: { id: input.invitationId },
        data: { status: "accepted" },
      });

      // Switch to the new organization
      await ctx.db.session.update({
        where: { id: ctx.session.session!.id },
        data: { activeOrganizationId: invitation.organizationId },
      });

      return { success: true, organizationId: invitation.organizationId };
    }),

  declineInvitation: protectedProcedure
    .input(
      z.object({
        invitationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the invitation belongs to this user
      const invitation = await ctx.db.invitation.findFirst({
        where: {
          id: input.invitationId,
          email: ctx.session.user.email,
          status: "pending",
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Update invitation status
      await ctx.db.invitation.update({
        where: { id: input.invitationId },
        data: { status: "declined" },
      });

      return { success: true };
    }),
});
