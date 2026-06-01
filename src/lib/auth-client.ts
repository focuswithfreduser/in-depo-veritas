import {
  adminClient,
  inferAdditionalFields,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "@/create-env.mjs";
import type { auth } from "./auth";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: env.NEXT_PUBLIC_DEPLOYMENT_URL,
  plugins: [
    inferAdditionalFields<typeof auth>(),
    organizationClient(),
    adminClient(),
    emailOTPClient(),
  ],
});
