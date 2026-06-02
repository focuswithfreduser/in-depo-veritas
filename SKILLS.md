# SKILLS.md — Coding standards & project conventions

Read before touching code. These are the conventions used across the repo today; new code must follow them. If you find drift, prefer fixing the new code to match the existing pattern rather than spreading the inconsistency.

---

## 1. Stack (don't introduce alternatives)

- **Runtime / framework**: Next.js 15 (App Router), React 19, Node via Next.
- **Language**: TypeScript, `strict: true`. Target ES5, `moduleResolution: "bundler"`.
- **Package manager**: `pnpm` (lockfile is `pnpm-lock.yaml`). Never run `npm install` / `yarn`.
- **Database**: PostgreSQL via Prisma. Generated client lives at `@/app/generated/prisma/client` — **always import from there**, not from `@prisma/client`.
- **API**: tRPC v11 with `superjson` transformer + Zod input validation.
- **Auth**: Better Auth (organization + session model). Server-side session via `auth.api.getSession({ headers })`.
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives) + `class-variance-authority` + `lucide-react` icons.
- **Forms / data**: TanStack Query (via tRPC), TanStack Table, `sonner` for toasts, `zustand` for client state.
- **AI**: Vercel AI SDK (`ai`) with `@ai-sdk/anthropic` (primary) and `@ai-sdk/openai`. Always wrap LLM calls in `pRetry`.
- **Background jobs**: Trigger.dev (`@trigger.dev/sdk`).
- **Storage**: Supabase Storage via `@/lib/supabase-service`.
- **Email**: Resend + React Email templates under `src/emails`.
- **Payments**: Stripe.
- **Tests**: Vitest. The repo has no test files in `src/` today — don't add a sprawling test suite unless asked.
- **Lint / format**: ESLint (`next` + `prettier`) and Prettier (`trailingComma: "all"`, `singleQuote: false` → **double quotes**, `prettier-plugin-tailwindcss` for class sorting).

Before adding any new dependency, check `package.json` — if an equivalent already exists, use it. No `axios` (use `fetch`), no `dayjs` (use `date-fns`), no `lodash-es` (use the existing `lodash`), no `yup` (use `zod`).

---

## 2. Repository layout

```
src/
  app/                   Next.js App Router routes & route-local components
    (auth)/              Route group for sign-in flows
    app/                 Authenticated app shell
    api/                 Route handlers (tRPC, auth, cron, webhooks)
  components/            Shared React components
    ui/                  shadcn/ui primitives (don't reinvent these)
  features/              Domain logic (summarize/, chat/, admin/, mail-view/, …)
  server/
    api/
      routers/           tRPC routers (one file per domain)
      trpc.ts            Context, procedures, middlewares
    utils/               Server-only helpers
  services/              External-service integrations (email, llm, …)
  lib/                   Shared utilities (db, auth, supabase, utils, cn)
  emails/                React Email templates
  trigger/               Trigger.dev task definitions
  scripts/               One-off / CLI scripts (run with tsx)
prisma/
  schema.prisma          Source of truth for the data model
  migrations/            Generated migrations (named `*_dev` by convention)
```

Place new code by **domain feature**, not by technical layer:

- A new domain capability → `src/features/<feature>/`.
- A tRPC endpoint that exposes it → `src/server/api/routers/<domain>.ts`, then register in the root router.
- A route-local component (used only by one page) → next to that page, under `components/`.
- A component reused across pages → `src/components/`.

---

## 3. Naming, imports, formatting

- **Files**: `kebab-case.ts` / `kebab-case.tsx` (e.g. `delete-user-dialog.tsx`, `generate-chunk.ts`). Match what's already in the same folder.
- **React components**: `PascalCase` exported names. Prefer **named exports** for everything; only use `export default` when a Next.js convention requires it (`page.tsx`, `layout.tsx`, `loading.tsx`, `route.ts`, `middleware.ts`).
- **Functions / variables**: `camelCase`. Constants meant to be tuned: `SCREAMING_SNAKE_CASE` (see `INCLUDED_PREVIOUS_CHUNKS_COUNT`, `MAX_SUMMARY_CHUNKS_FOR_ABSTRACT`).
- **Path alias**: import from `@/...` (mapped to `./src/*`). Never use long relative chains like `../../../lib/db`.
- **Imports**: keep external packages first, then `@/…`, then relative. The `@ianvs/prettier-plugin-sort-imports` dev dep is configured to sort — run `pnpm prettier:fix` if unsure.
- **Quotes**: double quotes (Prettier enforces).
- **Trailing commas**: always (Prettier enforces).
- **Client components**: top of file `"use client";` — only when the file actually uses hooks/state/event handlers. Server components are the default; don't add `"use client"` defensively.

Before considering work done, run:

```
pnpm types          # tsc --noEmit
pnpm check          # lint + prettier
```

`pnpm check:fix` auto-formats. Don't commit unformatted code.

---

## 4. tRPC: server endpoints

The procedures are defined in `src/server/api/trpc.ts`. **Pick the right one — do not roll your own auth check:**

| Procedure                          | When to use                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `publicProcedure`                  | Truly public. Session may be present but is not required.                   |
| `protectedProcedure`               | Logged-in user, no organization scoping required.                           |
| `protectedOrganizationProcedure`   | **Default for app endpoints.** Requires `activeOrganizationId`.             |
| `requiresSubscriptionMiddleware`   | Wrap when the endpoint costs money / consumes credits.                      |
| `adminProcedure`                   | User must have `role === "admin"`.                                          |
| `adminOrApiKeyProcedure`           | Admin **or** valid `x-api-key` header. Used by screenshot/cron paths.       |

Rules of the road:

- **Always validate input with Zod** via `.input(z.object({ … }))`. No untyped `any` inputs.
- **Throw `TRPCError`** with a proper `code` (`UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`, `NOT_FOUND`, `PAYMENT_REQUIRED`, `INTERNAL_SERVER_ERROR`). Never throw raw `Error` from a router.
- **Scope every DB query by `activeOrganizationId`** unless the endpoint is admin-only. Re-check ownership before returning signed URLs, deleting, archiving, or running expensive operations on a record — see existing patterns in `document.ts` (`getSignedPDFUrl` looks up the document under the active org *before* issuing the URL). Cross-tenant leaks are the #1 security risk; this is non-negotiable.
- **Filter out soft-deleted rows** with `deletedAt: null` on every read of soft-deletable entities (documents, etc.).
- **Use `select`** in Prisma queries instead of returning whole rows when the consumer only needs a subset — see `document.list`.
- **Don't add new top-level fields to `ctx`** without a reason. The context is built in `createTRPCContext`; extend via middleware (see `requiresSubscriptionMiddleware`) so types flow correctly.
- **Streaming endpoints** use `async function*` mutations — see `chat.sendMessage_streaming`.

Register new routers in `src/server/api/root.ts` (or wherever the root router lives) — don't create a parallel router tree.

---

## 5. Database (Prisma)

- Single shared client: `import { db } from "@/lib/db";`. **Never `new PrismaClient()`** in app code — it leaks connections.
- Types come from `@/app/generated/prisma/client` (e.g. `ModelProvider`, `Subscription`, `SummaryChunk`). Don't redefine these as TS unions.
- **Schema changes** → `pnpm migrate` (runs `prisma migrate dev --name dev`). Migration folders are named `<timestamp>_dev/` by convention. Don't hand-edit generated SQL unless you know what you're doing; add a data backfill script next to the migration if needed (see `prisma/migrations/20250902082513_dev/backfill-trials.ts`).
- Use Prisma's relational `connect` / `include` / `select` rather than raw SQL.
- Soft-delete pattern: set `deletedAt`, then exclude `deletedAt: null` on reads.

---

## 6. Frontend conventions

### Components

- Pull primitives from `@/components/ui/*` (shadcn). If a primitive is missing, generate it via the shadcn CLI rather than hand-rolling.
- Compose className with `cn(...)` from `@/lib/utils`. **Never** concatenate Tailwind classes with `+` or template literals — `cn` merges via `tailwind-merge` and dedupes conflicting utilities.
- Variants → `cva` (see `src/components/ui/button.tsx`).
- Icons: `lucide-react` for app UI, `react-icons` only when matching an existing pattern in a file.

### Data fetching on the client

- Use the typed tRPC client: `import { api } from "@/trpc/react";`.
- Queries: `api.<router>.<proc>.useQuery(input, options)`.
- Mutations: `api.<router>.<proc>.useMutation({ onSuccess, onError })`. On success, invalidate touched queries via `const utils = api.useUtils(); utils.<router>.<proc>.invalidate();` — see `invite-team-member-dialog.tsx`.
- User feedback on mutations: `toast.success` / `toast.error` from `sonner`. Surface `error.message` from tRPC, don't swallow it.
- Loading & empty states are required — never render a half-defined UI while data is loading. Mirror the patterns in existing pages (skeleton or "Loading…" line + the eventual layout).

### Forms

- Controlled inputs with local `useState` is the dominant pattern for small dialogs. Reach for `react-hook-form` only when a form has many fields or complex validation — match what neighboring forms do.

### State

- Server state lives in tRPC/TanStack Query. Don't duplicate it in `useState`.
- Cross-component client state → `zustand` store, scoped to a feature.

### Server components vs client components

- Default to server components. Add `"use client"` only when you need interactivity, browser APIs, or a hook.
- Don't import server-only modules (`@/lib/db`, `@/lib/supabase-service`, anything reading env vars) from a client component.

---

## 7. AI / LLM calls

- Model selection goes through `getModelForProvider(modelProvider: ModelProvider)` from `@/features/summarize/models`. Don't hardcode model strings in feature code.
- The current default is `ModelProvider.claude_haiku_4_5` (see `document.createFromSupabaseUrl`, `chat.ts`). When in doubt, default to that.
- **Always wrap calls in `pRetry`** with the standard retry config used elsewhere:
  ```ts
  await pRetry(async () => generateObject({ … }), {
    retries: 3,
    minTimeout: 60_000, // 1 minute
    factor: 1,           // flat wait, no exponential backoff
  });
  ```
- Structured output: `generateObject` + Zod schema. Free text: `generateText`.
- After each call, record `timeInMs` (elapsed wall clock), `inputTokenCount`, `outputTokenCount`, and `estimatedCost` via `calculateCost(modelProvider, in, out)`. Don't store token counts in time fields and vice versa.
- For test environments, respect the `USE_TEST_PROVIDERS` env flag and route through `mockChatModel` — see `chat.ts`.

---

## 8. Storage (Supabase)

- Use the helpers in `@/lib/supabase-service`: `getUploadUrl`, `getDownloadUrl`, `uploadFile`. Don't call `supabase.storage.from(...)` directly from feature code.
- File path convention for documents: `<organizationId>/<documentId>-original.<ext>` and `<organizationId>/<documentId>-summary.pdf`. Don't invent new layouts.
- Before issuing a signed URL, **always verify the requesting user/org owns the underlying record**.

---

## 9. Background work (Trigger.dev)

- Tasks live under `src/trigger/`. Trigger a task from a tRPC mutation via the helpers exported there (e.g. `triggerDocument(documentId)`), not by reaching into the SDK directly from a router.
- Long-running document processing, summarization, screenshotting, etc. should be Trigger jobs, not inline awaits in HTTP handlers.

---

## 10. Errors, logging, secrets

- **Server**: throw `TRPCError` for API surface errors. Use `ensureError(value)` from `@/lib/utils` when normalizing an unknown caught value.
- **Client**: surface errors through `toast.error(error.message)`; don't `alert()`.
- **Logging**: `console.log` / `console.error` is acceptable on the server (the codebase already uses it freely, including emoji prefixes like `🔓` for legibility in logs). For the client, gate noisy logs behind dev (this is on the Phase 2 cleanup list).
- **Env vars**: access through `env` from `@/create-env.mjs` (typed via `@t3-oss/env-nextjs`). Don't read `process.env.X` directly outside of that file. If you need a new variable, add it to the Zod schema in `create-env.mjs` first.
- **Secrets**: never log them, never commit them to `.env*` that's tracked. `.env.local` is the local dev file.

---

## 11. Security checklist (apply to every new endpoint)

Before merging anything new on the server side, walk through this:

1. Right procedure for the auth level? (`protectedOrganizationProcedure` is the default; `adminProcedure` for admin paths.)
2. All inputs validated with Zod?
3. Every DB query scoped by `activeOrganizationId` (or admin-justified)?
4. Re-verified ownership before signed URLs, deletes, archives, bulk operations?
5. Excluded `deletedAt: null` rows on reads?
6. No `console.log(secret)` / no secret in error messages?
7. Errors thrown as `TRPCError` with appropriate codes?
8. Any randomness used for security (tokens, OTPs) sourced from Web Crypto, **not** `Math.random()`?

`docs/depo-veritas-candidate-todo.md` Phase 1 is the recent history of where this list bit us — read it if you're touching auth, documents, chat, or webhooks.

---

## 12. Style: comments, abstractions, scope

- **Write no comments by default.** Only add a comment for the *why* — a non-obvious constraint, a workaround, a deliberate non-fix. Don't explain *what* well-named code already says.
- **Don't add features, refactors, or "while I'm here" cleanups beyond the task.** Bug fixes don't need surrounding restructuring. If you spot a separate issue, surface it; don't bundle it.
- **No premature abstractions.** Three similar lines beats a wrong abstraction. Wait for the fourth caller before extracting.
- **No defensive code for impossible states.** Trust the types and the framework. Validate at boundaries (user input, external APIs); don't re-validate internal calls.
- **No backwards-compat shims** unless explicitly requested. If you remove something, remove it cleanly — don't leave `// removed` markers, renamed-to-`_unused` vars, or dead re-exports.
- **Match the surrounding file.** If a neighboring router uses `ctx.session.session.activeOrganizationId!`, do the same; don't refactor it on your way through.

---

## 13. Things this codebase does that look unusual (don't "fix" them)

- `db` is a lazy-initialized PrismaClient via `createLazyResource` — that's intentional, leave it.
- The Prisma client is imported from `@/app/generated/prisma/client`, not `@prisma/client`. That's the configured `output` location.
- `protectedOrganizationProcedure` uses a non-null assertion (`activeOrganizationId!`) on the ctx even though the middleware already narrowed the type — kept for ergonomics. Match the local style.
- Emoji in server console logs (`🔓`, `‼️`) is intentional for log scanning. Don't strip them.
- `docs/rules/*.md` and `docs/*-plan.md` are working notes, not specs. Treat the code as the source of truth; ask before relying on a doc that looks stale.

---

## 14. Quick reference: common imports

```ts
// Server
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedOrganizationProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { db } from "@/lib/db";
import { ModelProvider } from "@/app/generated/prisma/client";
import { env } from "@/create-env.mjs";

// LLM
import { generateObject, generateText } from "ai";
import pRetry from "p-retry";
import { getModelForProvider } from "@/features/summarize/models";
import { calculateCost } from "@/services/llm/cost";

// Storage
import { getUploadUrl, getDownloadUrl } from "@/lib/supabase-service";

// Client
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
```

If you need something that isn't covered here, look for the closest existing example in the same `features/` or `routers/` folder and follow that pattern.
