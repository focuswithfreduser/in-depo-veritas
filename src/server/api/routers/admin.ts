import { z } from "zod";

import { takeScreenshotAndSave } from "@/features/create-summaries/screenshot/take-screenshot";
import { db } from "@/lib/db";

import { summarizeDocument } from "@/features/summarize/summarize-document";

import { fetchPages } from "@/features/summarize/extract/extract";
import { resetDocument } from "@/features/summarize/reset-document";
import { triggerDocument } from "@/trigger/document-task";
import {
  adminOrApiKeyProcedure,
  adminProcedure,
  createTRPCRouter,
} from "../trpc";
import { cloneDocumentsToWorkspace } from "@/server/utils/clone-documents";
import { getAdminInviteParams } from "@/emails/user/admin-invite";
import { sendEmail } from "@/services/email/resend";
import { env } from "@/create-env.mjs";
import { deleteUser } from "@/server/utils/delete-user";
import { formatEmail } from "@/lib/utils";
import { TRPCError } from "@trpc/server";

export const adminRouter = createTRPCRouter({
  listFiles: adminProcedure.query(async () => {
    const files = await db.document.findMany({
      select: {
        id: true,
        createdAt: true,
        isArchived: true,
        fileName: true,
        fileUrl: true,
        summaryUrl: true,
        status: true,
        triggerId: true,
        pageCount: true,
        relevantStartPage: true,
        relevantEndPage: true,
        organization: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return files;
  }),

  listOrganizations: adminProcedure.query(async (opts) => {
    return db.organization.findMany({
      include: {
        trial: true,
      },
    });
  }),

  getOrganization: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const organization = await db.organization.findUnique({
        where: { id: input.id },
        include: {
          trial: true,
          subscriptions: {
            where: {
              status: {
                in: ["active", "canceled"],
              },
            },
          },
        },
      });

      if (!organization) {
        return null;
      }

      // Determine organization status
      let organizationStatus: {
        type: "subscription" | "free_forever" | "trial" | "none";
        subscription?: {
          status: string;
          periodEnd: Date;
          periodStart: Date;
        };
        trial?: {
          endsAt: Date;
          hasEnded: boolean;
          creditsAvailable: number;
          creditsUsed: number;
        };
      };

      const activeSubscription = organization.subscriptions[0];

      if (activeSubscription) {
        organizationStatus = {
          type: "subscription",
          subscription: {
            status: activeSubscription.status,
            periodEnd: activeSubscription.periodEnd,
            periodStart: activeSubscription.periodStart,
          },
        };
      } else if (organization.freeForever) {
        organizationStatus = {
          type: "free_forever",
        };
      } else if (organization.trial) {
        const now = new Date();
        organizationStatus = {
          type: "trial",
          trial: {
            endsAt: organization.trial.endsAt,
            hasEnded: organization.trial.endsAt < now,
            creditsAvailable: organization.trial.creditsAvailable,
            creditsUsed: organization.trial.creditsUsed,
          },
        };
      } else {
        organizationStatus = {
          type: "none",
        };
      }

      return {
        ...organization,
        organizationStatus,
      };
    }),

  listUsers: adminProcedure.query(async (opts) => {
    const users = await db.user.findMany({});

    return users;
  }),

  listUsersWithOrganizations: adminProcedure.query(async (opts) => {
    const users = await db.user.findMany({
      include: {
        members: {
          include: {
            organization: {
              include: {
                trial: true,
                subscriptions: {
                  where: {
                    status: {
                      in: ["active", "canceled"],
                    },
                  },
                },
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            isArchived: true,
          },
        },
        sessions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            createdAt: true,
          },
        },
      },
    });

    // Add computed status to each organization and document counts
    const usersWithStatus = users.map((user) => {
      const totalDocuments = user.documents.length;
      const nonArchivedDocuments = user.documents.filter(
        (doc) => !doc.isArchived,
      ).length;

      return {
        ...user,
        _count: {
          documents: totalDocuments,
          nonArchivedDocuments: nonArchivedDocuments,
        },
        members: user.members.map((member) => {
          const org = member.organization;
          const activeSubscription = org.subscriptions[0];

          let status: {
            type: "subscription" | "free_forever" | "trial" | "none";
            label: string;
          };

          if (org.freeForever) {
            status = {
              type: "free_forever",
              label: "Free Forever",
            };
          } else if (activeSubscription) {
            status = {
              type: "subscription",
              label:
                activeSubscription.status === "active"
                  ? "Active Subscription"
                  : "Cancelled Subscription",
            };
          } else if (org.trial) {
            const hasEnded = org.trial.endsAt < new Date();
            if (hasEnded) {
              status = {
                type: "trial",
                label: "Trial Ended",
              };
            } else {
              status = {
                type: "trial",
                label: `Free Trial ${org.trial.creditsUsed}/${org.trial.creditsAvailable}`,
              };
            }
          } else {
            status = {
              type: "none",
              label: "No Status",
            };
          }

          return {
            ...member,
            organization: {
              ...org,
              status,
            },
          };
        }),
      };
    });

    return usersWithStatus;
  }),

  toggleFreeForever: adminProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const org = await db.organization.findFirstOrThrow({
        where: { id: input.id },
      });
      return db.organization.update({
        where: { id: input.id },
        data: { freeForever: !org.freeForever },
      });
    }),

  topupTrialCredits: adminProcedure
    .input(
      z.object({
        id: z.string(),
        credits: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const org = await db.organization.findFirstOrThrow({
        where: { id: input.id },
        include: { trial: true },
      });
      if (!org.trial) {
        throw new Error(`No trial found for organization '${org.name}'.`);
      }
      if (input.credits < org.trial.creditsUsed) {
        throw new Error(
          `${org.trial.creditsUsed} credits have already been used, cannot set available to ${input.credits}.`,
        );
      }
      return db.trial.update({
        where: { id: org.trial.id },
        data: { creditsAvailable: input.credits },
      });
    }),

  extendTrial: adminProcedure
    .input(
      z.object({
        id: z.string(),
        endsAt: z.date(),
        creditsAvailable: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const org = await db.organization.findFirstOrThrow({
        where: { id: input.id },
        include: { trial: true },
      });

      // If no trial exists, create one
      if (!org.trial) {
        const trial = await db.trial.create({
          data: {
            endsAt: input.endsAt,
            creditsAvailable: input.creditsAvailable,
            creditsUsed: 0,
          },
        });
        // Connect the trial to the organization
        await db.organization.update({
          where: { id: org.id },
          data: { trialId: trial.id },
        });
        return trial;
      }

      // If trial exists, validate and update
      if (input.creditsAvailable < org.trial.creditsUsed) {
        throw new Error(
          `${org.trial.creditsUsed} credits have already been used, cannot set available to ${input.creditsAvailable}.`,
        );
      }
      return db.trial.update({
        where: { id: org.trial.id },
        data: {
          endsAt: input.endsAt,
          creditsAvailable: input.creditsAvailable,
        },
      });
    }),

  getDocument: adminOrApiKeyProcedure
    .input(z.object({ id: z.string() }))
    .query(async (opts) => {
      const { id } = opts.input;
      const document = await db.document.findFirstOrThrow({
        where: {
          id,
        },
        include: {
          summaryChunks: {
            orderBy: { startPage: "asc" },
          },
          metadata: true,
          abstract: true,
        },
      });

      const { pages } = await fetchPages(document);

      return { ...document, pages };
    }),

  retryWeb: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;

      const document = await db.document.findFirstOrThrow({
        where: { id },
      });

      await summarizeDocument(document.id);

      return { success: true, message: "Summarize complete" };
    }),

  triggerSummary: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id } = input;

      const document = await db.document.findFirstOrThrow({
        where: { id },
      });

      await triggerDocument(document.id, true); // Skip email for admin triggers

      return { success: true, message: "V2 summarize complete" };
    }),

  screenshot: adminOrApiKeyProcedure
    .input(z.object({ id: z.string(), isFull: z.boolean() }))
    .mutation(async ({ input }) => {
      const { id, isFull } = input;
      const document = await db.document.findFirstOrThrow({
        where: { id },
      });

      const filePath = await takeScreenshotAndSave(
        id,
        document.organizationId,
        isFull,
      );

      return { success: true, filePath };
    }),

  resetDocument: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id } = input;
      await resetDocument(id);
      return { success: true, message: "Document reset complete" };
    }),

  updateRelevantPages: adminProcedure
    .input(
      z.object({
        id: z.string(),
        relevantStartPage: z.number().nullable(),
        relevantEndPage: z.number().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, relevantStartPage, relevantEndPage } = input;

      await resetDocument(id);

      const document = await db.document.update({
        where: { id },
        data: {
          relevantStartPage,
          relevantEndPage,
        },
      });

      return { success: true, document };
    }),

  archiveDocument: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id } = input;

      const document = await db.document.update({
        where: { id },
        data: { isArchived: true },
      });

      return { success: true, document };
    }),

  unarchiveDocument: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id } = input;

      const document = await db.document.update({
        where: { id },
        data: { isArchived: false },
      });

      return { success: true, document };
    }),

  cloneDocumentsToWorkspace: adminProcedure
    .input(
      z.object({
        documentIds: z.array(z.string()),
        targetOrganizationId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return cloneDocumentsToWorkspace(
        input.documentIds,
        input.targetOrganizationId,
        ctx.session.user.id,
      );
    }),

  inviteUser: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1),
        organizationName: z.string().min(1),
        sendEmail: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      const {
        email: rawEmail,
        name,
        organizationName,
        sendEmail: shouldSendEmail,
      } = input;
      const email = formatEmail(rawEmail);

      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Generate OTP code (6 digits) only if we're sending email
      const otp = shouldSendEmail ? generateNumericOtp() : null;

      // Create user and organization in a transaction
      const result = await db.$transaction(async (tx) => {
        // Create the user
        const user = await tx.user.create({
          data: {
            email,
            name,
            firstName: name.split(" ")[0] ?? name,
            emailVerified: true,
          },
        });

        // Create the organization as free forever
        const organization = await tx.organization.create({
          data: {
            name: organizationName,
            freeForever: true,
          },
        });

        // Create the membership linking user to organization
        await tx.member.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: "owner",
          },
        });

        // Create verification code only if sending email (expires in 3 days)
        if (shouldSendEmail && otp) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 3);

          await tx.verification.create({
            data: {
              identifier: email,
              value: otp,
              expiresAt,
            },
          });
        }

        return { user, organization };
      });

      // Send welcome email with OTP if requested
      if (shouldSendEmail && otp) {
        const loginUrl = `${env.NEXT_PUBLIC_DEPLOYMENT_URL}/login`;
        const emailParams = await getAdminInviteParams(
          email,
          name,
          otp,
          loginUrl,
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
      }

      return result;
    }),

  // Suspend a user — restrict access NOW. Optionally auto-lift at expiresAt.
  // Semantics: banned BEFORE expiresAt; restored AFTER. Pass expiresAt: null
  // to clear the suspension entirely (unsuspend).
  setUserSuspension: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        // null    -> clear suspension (unban)
        // Date    -> suspend until this absolute time (then auto-restore)
        // omitted -> permanent suspension (banned with no expiry)
        expiresAt: z.date().nullable().optional(),
        reason: z.string().optional(),
        permanent: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId, expiresAt, reason, permanent } = input;

      if (userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot suspend yourself",
        });
      }

      await db.user.findUniqueOrThrow({ where: { id: userId } });

      // Unsuspend
      if (expiresAt === null && !permanent) {
        const updated = await db.user.update({
          where: { id: userId },
          data: { banned: false, banExpires: null, banReason: null },
          select: { id: true, banned: true, banExpires: true },
        });
        return { success: true, ...updated };
      }

      // Time-limited suspension must be in the future
      if (expiresAt && expiresAt.getTime() <= Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Suspension expiry must be in the future",
        });
      }

      const updated = await db.user.update({
        where: { id: userId },
        data: {
          banned: true,
          banExpires: permanent ? null : expiresAt ?? null,
          banReason: reason?.trim() || "Suspended by administrator",
        },
        select: {
          id: true,
          banned: true,
          banExpires: true,
          banReason: true,
        },
      });

      // Revoke active sessions so the suspension applies immediately.
      await db.session.deleteMany({ where: { userId } });

      return { success: true, ...updated };
    }),

  // Grant time-limited access — user has access UNTIL expiresAt, then loses
  // it. Inverse of suspension. Pass expiresAt: null to clear the limit
  // (unlimited access).
  setUserAccessExpiry: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        // null -> remove access limit (unlimited)
        // Date -> access expires at this absolute time
        expiresAt: z.date().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId, expiresAt } = input;

      if (userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot set your own access expiry",
        });
      }

      await db.user.findUniqueOrThrow({ where: { id: userId } });

      if (expiresAt !== null && expiresAt.getTime() <= Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Access expiry must be in the future",
        });
      }

      const updated = await db.user.update({
        where: { id: userId },
        data: { accessExpiresAt: expiresAt },
        select: { id: true, accessExpiresAt: true },
      });

      return { success: true, ...updated };
    }),

  toggleAdminRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId } = input;

      // Don't allow toggling your own admin status
      if (userId === ctx.session.user.id) {
        throw new Error("You cannot change your own admin status");
      }

      const user = await db.user.findUniqueOrThrow({
        where: { id: userId },
      });

      const newRole = user.role === "admin" ? null : "admin";

      const updatedUser = await db.user.update({
        where: { id: userId },
        data: { role: newRole },
      });

      return updatedUser;
    }),

  resendInvite: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { userId } = input;

      // Get the user
      const user = await db.user.findUniqueOrThrow({
        where: { id: userId },
      });

      // Generate new OTP code (6 digits)
      const otp = generateNumericOtp();

      // Delete any existing verification codes for this user
      await db.verification.deleteMany({
        where: { identifier: user.email },
      });

      // Create new verification code (expires in 3 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      await db.verification.create({
        data: {
          identifier: user.email,
          value: otp,
          expiresAt,
        },
      });

      // Send welcome email with OTP
      const loginUrl = `${env.NEXT_PUBLIC_DEPLOYMENT_URL}/login`;
      const emailParams = await getAdminInviteParams(
        user.email,
        user.name,
        otp,
        loginUrl,
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

      return { success: true };
    }),

  getUserOrganizations: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { userId } = input;

      const members = await db.member.findMany({
        where: { userId },
        include: {
          organization: {
            include: {
              members: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      return members.map((member) => ({
        name: member.organization.name,
        isSoleMember: member.organization.members.length === 1,
      }));
    }),

  deleteUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId } = input;

      // Prevent deleting yourself
      if (userId === ctx.session.user.id) {
        throw new Error("You cannot delete your own account");
      }

      // Call the utility function
      await deleteUser(userId);

      return { success: true };
    }),
});

export async function createHash(message: string) {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toString();
}

export function randomString(size: number) {
  const i2hex = (i: number) => ("0" + i.toString(16)).slice(-2);
  const r = (a: string, i: number): string => a + i2hex(i);
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes).reduce(r, "");
}

function generateNumericOtp() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (100000 + (arr[0] % 900000)).toString();
}
