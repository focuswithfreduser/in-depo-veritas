# In Depo Veritas

SaaS app for deposition summarisation. Users upload a deposition PDF; the app runs an AI summarisation pipeline (Anthropic / OpenAI via Vercel AI SDK, queued on Trigger.dev), stores artefacts in Supabase, and delivers the result by email.

Stack: Next.js 15 (App Router) · React 19 · tRPC · Prisma · PostgreSQL · Better Auth · Stripe · Tailwind / shadcn UI · Trigger.dev · Vitest.

---

## Prerequisites

- **Node.js 20+**
- **pnpm 8.15+** (pinned via `packageManager` in `package.json`)
- **Docker** (used by `pnpm setup:local` to spin up a local Postgres)

Optional but useful for full feature parity:

- A **Trigger.dev** account (background jobs)
- An **Anthropic** or **OpenAI** API key (LLM calls)
- A **Supabase** project (file storage)
- A **Resend** API key (transactional email)
- A **Stripe** account (billing)

For day-to-day development without these you can use placeholders — the `pnpm setup:local` script fills them in automatically and the app still boots; only the features that depend on them will be inactive.

---

## Quick start (recommended)

```bash
pnpm install
pnpm setup:local
pnpm dev
```

What `pnpm setup:local` does:

1. Copies `.env.example` → `.env.local` and fills in dev-safe placeholder values.
2. Starts (or creates) a Docker container `postgres-indepoveritas` on port `5432`.
3. Runs `prisma generate` and applies all migrations.
4. Bootstraps a local admin user (`dev@local.dev`) and a dev organisation.

The dev server runs at **<http://localhost:4049>**.

### Daily workflow (after first-time setup)

The Postgres container does not auto-start with your machine. After a reboot — or any time `pnpm dev` returns `500` on every tRPC call — make sure the database is up:

```bash
docker start postgres-indepoveritas
pnpm dev
```

You can leave it running between sessions; it just needs to be started once per machine boot. Re-running `pnpm setup:local` also works (it will `docker start` an existing container or create a new one if it's been removed).

### Logging in locally

1. Open <http://localhost:4049/login>.
2. Enter the bootstrapped email: **`dev@local.dev`** (or any user created via `pnpm seed:test-users`).
3. Request the one-time code. In development, the OTP **is not emailed** — it is printed to the **dev-server console**. Copy it from there and paste it on the login screen.

### Seeding extra test users

```bash
pnpm seed:test-users
```

Idempotent. Creates a set of users covering the access-control states (active, time-limited grant, expired grant, temporary suspension, lapsed suspension, permanent suspension). See `src/scripts/seed-test-users.ts` for the full list.

---

## Manual setup (if you skip `setup:local`)

1. **`.env.local`** — copy `.env.example` and fill in. The critical values for booting are:
   - `BETTER_AUTH_SECRET` — any random string for dev
   - `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` — your Postgres connection string
   - `NEXT_PUBLIC_DEPLOYMENT_URL` — `http://localhost:4049`
   - `TRPC_BASE_URL` — `http://localhost:4049/api/trpc`
   - `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — only required for upload/download features
2. **Database**: any reachable Postgres works. Locally the project assumes `postgres-indepoveritas` (Docker), user `user`, password `pass`, db `indepoveritas`.
3. **Apply schema**:
   ```bash
   pnpm generate     # prisma generate
   pnpm exec dotenv -e .env.local -- npx prisma migrate deploy
   ```
4. **Bootstrap dev admin**:
   ```bash
   pnpm bootstrap:dev
   ```
5. **Run**:
   ```bash
   pnpm dev
   ```

---

## Useful scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Next.js dev server on port 4049 |
| `pnpm build` / `pnpm start` | Production build / start |
| `pnpm test` | Vitest in watch mode |
| `pnpm test:run` | Vitest single run (CI) |
| `pnpm types` | `tsc --noEmit` |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm check` / `pnpm check:fix` | Lint + Prettier |
| `pnpm studio` | Prisma Studio (DB browser) |
| `pnpm migrate` | Create a new migration from schema changes |
| `pnpm generate` | Regenerate Prisma client |
| `pnpm bootstrap:dev` | Re-create the local dev admin user |
| `pnpm seed:test-users` | Seed the access-control test fixture users |
| `pnpm trigger` | Run the Trigger.dev dev worker (background AI jobs) |
| `pnpm email` | React Email dev server for previewing templates |

---

## Background jobs (Trigger.dev)

The AI summarisation pipeline runs as a Trigger.dev task, not on the HTTP thread. To exercise it locally:

```bash
pnpm trigger:login   # one-time, authenticates the CLI
pnpm trigger         # runs the dev worker; keep it open in a second terminal
```

Uploads will queue and process through the local worker. Without it, uploads stay in the `pending` status.

---

## Stripe (billing)

Forward Stripe webhooks to the local server when working on billing flows:

```bash
stripe listen --forward-to http://local.indepoveritas.com:4049/api/webhooks/stripe
```

(Requires the Stripe CLI installed and authenticated.)

---

## Testing

```bash
pnpm test:run
```

Vitest runs in a Node environment with global mocks for Prisma, Supabase, Better Auth, the Vercel AI SDK, Trigger.dev, Resend, and Stripe (see `src/test/setup.ts`). All suites should pass on a clean checkout.

---

## Deployment

The frontend deploys to **Vercel** on PR merge (CI is wired up). Production environment variables live in the Vercel dashboard. Scheduled jobs (`vercel.json`):

- `/api/cron/cleanup-old-documents` — daily at 02:00 UTC
- `/api/cron/cleanup-expired-bans` — hourly

Both are protected by the `CRON_SECRET` environment variable.

---

## Project layout

```
src/
  app/           Next.js App Router (routes, layouts, pages, API)
  features/     Feature folders (mail-view, summarize, splash-screen, …)
  server/       tRPC routers (admin, billing, chat, document, me, organization)
  stores/       Zustand client stores (chat history in localStorage)
  trigger/      Trigger.dev task definitions
  lib/          Shared utilities (auth, db, supabase, etc.)
  components/   shadcn / UI primitives
  emails/       React Email templates
  scripts/      One-shot dev scripts (bootstrap, seed)
  test/         Vitest setup, factories, mocks
prisma/         Schema and migrations
docs/           Project docs, including depo-veritas-candidate-todo.md
```

---

## Common issues

- **Every tRPC call returns `500` after starting `pnpm dev`** — the Postgres container isn't running. Start it:
  ```bash
  docker start postgres-indepoveritas
  ```
  If Docker Desktop itself isn't running, start it first and wait until the tray icon stops spinning.
- **`EPERM: operation not permitted, rename …prisma\query_engine-windows.dll.node`** on Windows — the dev server is holding the Prisma engine file. Stop `pnpm dev`, re-run `pnpm generate`, then restart.
- **OTP doesn't arrive** — in development OTPs are intentionally not emailed; they are written to the dev-server console.
- **Uploads stuck in `pending`** — start the Trigger.dev worker (`pnpm trigger`).
- **Stripe events not received** — start `stripe listen` (see Stripe section).
