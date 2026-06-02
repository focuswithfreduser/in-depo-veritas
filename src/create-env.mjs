import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    POSTGRES_PRISMA_URL: z.url(),

    BETTER_AUTH_SECRET: z.string().min(1),
    TRIGGER_SECRET_KEY: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SCREENSHOT_API_KEY: z.string().min(1),
    USE_TEST_PROVIDERS: z.string().min(1).default("false").optional(),
    TRPC_BASE_URL: z.url(),
    // Comma-separated list of valid discount codes (case-insensitive match).
    // Empty / unset = discount feature disabled.
    DISCOUNT_CODES: z.string().default("").optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_DEPLOYMENT_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    // Server
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,

    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    NEXT_PUBLIC_DEPLOYMENT_URL: process.env.NEXT_PUBLIC_DEPLOYMENT_URL,
    TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SCREENSHOT_API_KEY: process.env.SCREENSHOT_API_KEY,
    USE_TEST_PROVIDERS: process.env.USE_TEST_PROVIDERS ?? "false",
    TRPC_BASE_URL: process.env.TRPC_BASE_URL,
    DISCOUNT_CODES: process.env.DISCOUNT_CODES ?? "",
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
   * This is especially useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
