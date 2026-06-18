import { env } from "@/create-env.mjs";
import { getNewUserSignupEmailParams } from "@/emails/admin/new-user-signup";
import { getAuthCodeParams } from "@/emails/user/send-auth-code";
import { db } from "@/lib/db";
import { sendEmail } from "@/services/email/resend";
import { formatEmail } from "@/lib/utils";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP, organization } from "better-auth/plugins";
import { getActiveOrganization } from "./get-active-org";
import { setDevOtp } from "./dev-otp-store";
import { createLazyResource } from "./utils/lazy-resource";
import { ACCESS_DENIED_MESSAGES, hasAccessExpired } from "./access-control";

export const auth = createLazyResource(() =>
  betterAuth({
    session: {
      expiresIn: 60 * 60 * 24 * 90, // 90 days
    },
    user: {
      additionalFields: {
        firstName: {
          type: "string",
          defaultValue: "",
          required: true,
        },
        shouldEmailOnComplete: {
          type: "boolean",
          defaultValue: true,
          required: false,
        },
        marketingEmails: {
          type: "boolean",
          defaultValue: true,
          required: false,
        },
        productUpdates: {
          type: "boolean",
          defaultValue: true,
          required: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            return {
              data: {
                ...user,
                email: formatEmail(user.email),
                firstName: user.name.split(" ")[0],
              },
            };
          },
          after: async (user) => {
            // Send admin notification email
            if (process.env.NODE_ENV === "development") {
              console.log(
                `Not sending admin notification email to ${user.email} as we are in development`,
              );
            } else {
              try {
                const emailParams = await getNewUserSignupEmailParams(
                  user.email,
                );
                await sendEmail(
                  emailParams.to as string,
                  emailParams.from,
                  emailParams.subject,
                  emailParams.html,
                  emailParams.text,
                );
              } catch (error) {
                console.error(
                  "Failed to send admin notification for new user:",
                  error,
                );
                // Don't throw error as this shouldn't break user signup
              }
            }
          },
        },
      },

      session: {
        create: {
          before: async (session) => {
            // Block sign-in for a user whose time-limited access has lapsed.
            // Better Auth only gates `banned` at session creation (the admin
            // plugin), not `accessExpiresAt` — so without this, an expired
            // user could complete OTP login and would only be stopped on
            // their first protected request. We mirror the admin plugin's
            // banned check here so expired users cannot sign in at all
            // (IMP-003), matching the admin UI's promise. The discriminating
            // `code` lets the login screen show a clear message.
            const dbUser = await db.user.findUnique({
              where: { id: session.userId },
              select: { accessExpiresAt: true },
            });
            if (hasAccessExpired(dbUser?.accessExpiresAt)) {
              throw new APIError("FORBIDDEN", {
                message: ACCESS_DENIED_MESSAGES["access-expired"],
                code: "ACCESS_EXPIRED",
              });
            }

            const organization = await getActiveOrganization(session.userId);
            return {
              data: {
                ...session,
                activeOrganizationId: organization?.id,
              },
            };
          },
        },
      },
    },
    baseURL: env.NEXT_PUBLIC_DEPLOYMENT_URL,
    database: prismaAdapter(db, {
      provider: "postgresql",
    }),

    plugins: [
      nextCookies(),
      organization(),
      admin(),

      emailOTP({
        disableSignUp: true,
        async sendVerificationOTP({ email, otp, type }) {
          if (process.env.NODE_ENV === "development") {
            setDevOtp(email, otp);
            console.log(
              `Not sending email to ${email} with OTP ${otp} as we are in development`,
            );
            return;
          }

          const emailParams = await getAuthCodeParams(email, otp);
          await sendEmail(
            emailParams.to as string,
            emailParams.from,
            emailParams.subject,
            emailParams.html,
            emailParams.text,
          );
        },
      }),
    ], // make sure this is the last plugin in the array
  }),
);
