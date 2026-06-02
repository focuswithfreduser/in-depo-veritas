# Depo Veritas Candidate Brief TODO

Tracking file for the stabilization work described in `depo_veritas_candidate_brief.md`.

## Phase 1 - Must-have: Security & Critical Bugs

- [x] S1: Restrict `document.get` to the active organization.
- [x] S2: Verify document ownership before immediate delete in `document.trash`.
- [x] S2 follow-up: Verify document ownership for archive and bulk delete paths touched by the same document deletion surface.
- [x] S3: Restrict `chat.sendMessage_streaming` document access to the active organization.
- [x] S4: Validate `getSignedPDFUrl` URLs against a document owned by the active organization before issuing signed URLs.
- [x] S5: Replace `Math.random()` invite OTP generation with Web Crypto-backed generation.
- [x] S7: Fix Stripe webhook non-`Error` condition.
- [x] S8: Extend middleware matcher to protect `/app/*` and `/onboarding/*` sub-routes.
- [x] B9: Build `adminOrApiKeyProcedure` on `publicProcedure` so timing middleware is consistently applied.
- [x] B1: Replace mutating `.splice()` with `.slice()` in abstract generation.
- [x] B2: Store elapsed time in `timeInMs` for abstract and chunk generation instead of token counts.

## Phase 2 - Nice-to-have: Demo Readiness

- [ ] Add visible chat error state and retry affordance.
- [ ] Ensure streamed chat errors do not leave input disabled.
- [ ] Add auto-scroll for new and streamed chat messages.
- [ ] Disable expensive `document.get` refetch on window focus and add an appropriate stale time.
- [ ] Verify or fix the `bg-yellow/10` warning banner styling.
- [ ] Update streamed chat state immutably.
- [ ] Add a graceful error boundary around `MailDisplay`.
- [ ] Gate noisy demo logs behind development-only behavior where appropriate.

## Phase 3 - Nice-to-have: High-priority Code Health

- [x] Decide how to remove or externalize hardcoded discount codes.
- [x] Require invitation or owner approval before users can self-join organizations by email domain.
- [x] Remove or implement dead admin `cancelJob`.
- [x] Remove dead `me.discount` endpoint if no longer needed.
- [x] Make active organization selection deterministic for multi-org users.
- [x] Align organization trial credit defaults across creation flows.
- [x] Clean up low-risk no-op code paths noted in the review.

## Phase 4 - Must-have: Time-limited Access

- [x] Confirm Better Auth `banExpires` enforcement behavior.
- [x] Add admin mutation to set user access expiry.
- [x] Add admin UI for access expiry.
- [x] Add fallback enforcement or cleanup job if Better Auth does not fully cover expiry behavior.

## Phase 5 - Must-have: Chat + Actions PDF Export

- [x] Confirm what "user actions" means with the client. (Decision: chat transcript + document metadata, no separate audit log.)
- [x] Decide between client-side PDF generation and server-side Puppeteer export. (Decision: client-side `@react-pdf/renderer`; chat lives in localStorage so client-side is the natural fit.)
- [x] Build branded chat transcript PDF export.
- [x] Include document metadata and export metadata in the PDF.
- [x] Keep existing fast text export available.

## Phase 6 - Must-have: Chat Export (Markdown + PDF)

- [x] Add Markdown chat export.
- [x] Reuse or align PDF export UI with Phase 5. (PDF export already delivered in Phase 5; Markdown button added next to it in the same toolbar.)
- [x] Add focused tests or manual verification for export formatting.

## ~~Phase 7 - Nice-to-have: Server-side Chat Save (Conditional)~~

- [ ] Confirm whether cross-device chat sync is required.
- [ ] Define chat retention policy.
- [ ] Add server-side chat persistence only if the requirement is confirmed.
- [ ] Decide how to handle existing localStorage chat history.

## Phase 8 - Nice-to-have: UI Polish & Backlog

- [ ] Improve labeling and spacing for adjacent download buttons.
- [ ] Make local chat persistence messaging more formal and visible.
- [ ] Add a chat textarea character limit with user feedback.
- [ ] Remove minor type-safety casts in chat submission handling.
- [ ] Triage remaining performance, logging, and pagination backlog items.

---

# Progress Log

Daily log of what was actually delivered, mapped against the brief. Each entry separates **brief / plan scope** from **extra work** that was useful but outside the literal scope.

## 2026-05-25 (Mon) — Phase 1: Security & Critical Bugs

### From the brief

Five critical IDOR vulnerabilities, three medium-severity security items, and the two data-integrity bugs called out in the code review were remediated:

- **S1** — `document.get`: added `organizationId` + `deletedAt: null` filter to the query.
- **S2** — `document.trash`: explicit ownership check (`findFirst` with `organizationId`) before any delete or archive path; covers both single-id and bulk-id mutations.
- **S3** — `chat.sendMessage_streaming`: added `organizationId` filter on the document lookup; switched to `findFirst` + explicit `FORBIDDEN` so the catch block does not swallow auth failures. Also removed the leftover `input.messages;` no-op (B6).
- **S4** — `document.getSignedPDFUrl`: now resolves the URL back to a document scoped by `organizationId` (admins bypass) before issuing a signed download URL. Supports both `fileUrl` and `summaryUrl`.
- **S5** — Weak OTP generation: extracted `generateNumericOtp()` using `crypto.getRandomValues`; applied in both `createUser` and `resendInvite`.
- **S7** — Stripe webhook: `if (err! instanceof Error)` → `if (!(err instanceof Error))`.
- **S8** — `middleware.ts` matcher widened to `["/app/:path*", "/onboarding/:path*"]`.
- **B9** — `adminOrApiKeyProcedure` rebuilt on `publicProcedure` so the timing middleware is consistently applied.
- **B1** — `generate-abstract.ts`: replaced mutating `.splice()` with `.slice()` so the caller's array is preserved.
- **B2** — `generate-abstract.ts` and `generate-chunk.ts`: store `Date.now() - start` in `timeInMs`, not the token count.

### Extra

None. Phase 1 was executed strictly to the code-review checklist.

## 2026-05-26 (Tue) — Phase 1 tests

### From the brief

The brief did not mandate tests, but every Phase 1 fix is a regression-prone area. A full test pass was added (~2,053 lines, 21 files) covering each remediated endpoint and helper:

- `document.test.ts` (285 lines) — regression coverage for S1, S2, S4 (rejects cross-org access; accepts same-org; admin bypass works).
- `chat.test.ts` (152 lines) — S3 coverage; verifies the `FORBIDDEN` path propagates.
- `admin.test.ts` (102 lines) — S5 coverage; OTPs generated via the CSPRNG helper.
- `trpc.test.ts` (248 lines) — full procedure hierarchy: `publicProcedure`, `protectedProcedure`, `protectedOrganizationProcedure`, `adminProcedure`, `adminOrApiKeyProcedure`, `requiresSubscriptionMiddleware`.
- `generate-abstract.test.ts`, `generate-chunk.test.ts` — B1/B2 coverage.
- Supporting test infrastructure: `src/test/factories.ts`, `src/test/mocks/db.ts`, `src/test/setup.ts`, `src/test/trpc-caller.ts`.

### Extra

The Phase 1 fixes were the brief; the test suite itself is extra scope, justified by the IDOR-regression risk (a future refactor that drops an `organizationId` filter would otherwise silently re-open S1–S4).

## 2026-05-27 (Wed) — Phase 4: Time-limited Access

### From the brief

All four todo items closed:

- **Confirmed Better Auth `banExpires` behavior** by reading the admin-plugin source: ban state is enforced only at session-creation, not on every request. `banUser` deletes sessions when called; expired bans are auto-cleared at next login.
- **Admin mutation** `admin.setUserSuspension` — wraps `db.user.update` with `banned/banExpires/banReason`, supports `permanent: true`, and revokes active sessions so the change takes effect immediately.
- **Admin UI**: `SuspendUserDialog` with shadcn `<Calendar>` + `<Popover>`, optional reason, "Permanent suspension" checkbox, and "Unsuspend" affordance. New "Access" column in the users table shows `Suspended` / `Time-limited` / `Access expired` badges with the relevant date.
- **Fallback enforcement** in `protectedProcedure` re-checks `banned` and `accessExpiresAt` on every tRPC request; lazily clears expired bans and revokes sessions on active ones. **Cleanup cron** at `/api/cron/cleanup-expired-bans` (`vercel.json`, hourly) sweeps expired bans for users who never log in again.

### Extra

After discussion it became clear the brief conflated two semantically opposite features:

- **Suspend until X** (what `banExpires` does natively — blocked now, restored later).
- **Access until X** (what the client actually wants for "invite a prospect for testing" — has access now, revoked later).

To resolve this we split the feature into two independent flows:

- Added `User.accessExpiresAt DateTime?` (Prisma migration `20260526083543_dev`).
- Added a second mutation `admin.setUserAccessExpiry` operating on the new field.
- Added a second dialog `SetAccessExpiryDialog` and a second row action.
- Extended the middleware to enforce both `banned`/`banExpires` AND `accessExpiresAt`.
- Toast on `BANNED_USER` when admin tries to impersonate a suspended user (the impersonation flow inherits the target's ban via Better Auth).
- Test seed `pnpm seed:test-users` covering all six access states (active, time-limited grant, expired grant, temp suspension, lapsed suspension, permanent suspension).

Tests: 10 new tests across `admin.test.ts` (six for `setUserSuspension`, five for `setUserAccessExpiry`), `trpc.test.ts` (suspension + access-expiry middleware paths), and a new `cleanup-expired-bans/route.test.ts` (auth header, success, error path).

The split (`accessExpiresAt` + second mutation + second dialog) is the main piece of "extra" work beyond a literal reading of the brief. It was a deliberate scope expansion to match the actual customer use case ("demo trial for prospects") rather than the implementation hint in the brief.

## 2026-05-27 (Wed) — Phase 5: Chat PDF Export

### From the brief

All five todo items closed:

- **"User actions" clarified with the user**: chat transcript + document metadata, no separate audit log. Activity-log work is explicitly deferred until John asks for it.
- **PDF approach decided**: client-side `@react-pdf/renderer` (per brief Option A). Chat lives in `localStorage`, so client-side generation is the natural fit and avoids needing to finish Phase 7 first.
- **Branded chat transcript PDF**: new `ChatExportDocument` (`src/features/mail-view/chat-export-pdf.tsx`) with a fixed header (app name + AI-transcript disclaimer), metadata grid, conversation blocks (user vs. assistant styling), and a fixed footer with "Exported by … on …" and page-of-pages numbering.
- **Metadata included**: file name, document created date, deponent, case number / title, deposition date / location, plus export timestamp and exporter name.
- **Existing `.txt` export preserved**: refactored `chat-actions.ts` to share `filterVisibleMessages` between both formats; `downloadChatAsText` and the inline `.txt` link in the chat panel are untouched.

### Extra

- Extracted `formatChatAsText` and `buildChatPdfData` as pure helpers so the format/transform logic is unit-testable without DOM stubs or PDF rendering.
- `@react-pdf/renderer` imported via `await import(...)` inside `downloadChatAsPdf` to keep the ~190 KB chunk out of the initial bundle.
- 12 new tests in `chat-actions.test.ts`: `filterVisibleMessages` edge cases, `formatChatAsText` formatting, `buildChatPdfData` mapping (happy path, filtering, missing metadata, empty result), plus a smoke test that actually renders the PDF document to a Node buffer and asserts the `%PDF-` magic bytes.
- `makeChatMessage()` factory added to `src/test/factories.ts`.
- `pnpm types` and `pnpm lint` clean; 157/157 tests passing (145 before today's Phase 5 work).

The brief's existing `.txt` export was untested before today; we now have regression coverage on both formats.

## 2026-05-27 (Wed) — Documentation pass: README rewrite

### From the brief

Not in the brief. Pure developer-experience work.

### Extra

The repository `README.md` previously consisted of three short and partly outdated lines (a Stripe-CLI command, a dead StackOverflow link about VS Code monorepo setup, and a pointer to "values found in `~/create-env.mjs`"). With four new joiners — including QA and a senior dev who will pick this up after the engagement — it needed to actually explain how to run the project.

Rewrote it end-to-end (English) covering:

- **Prerequisites** — Node 20+, pnpm 8.15+, Docker; optional third-party services with the explicit note that the app boots with placeholders if none are configured.
- **Quick start** — `pnpm install && pnpm setup:local && pnpm dev`, with a breakdown of exactly what `setup:local` does (env file, Postgres container, Prisma generate/migrate, dev-admin bootstrap).
- **Daily workflow** — `docker start postgres-indepoveritas` after each reboot; the container doesn't auto-start.
- **Login flow** — dev OTP is printed to the dev-server console (not emailed).
- **Seeding test users** — `pnpm seed:test-users` and what states the fixtures cover.
- **Manual setup** — fallback path for anyone who can't or doesn't want to use `setup:local`.
- **Useful scripts table** — every meaningful `package.json` script with a one-line description.
- **Background jobs** — when and how to start the Trigger.dev worker (`pnpm trigger`).
- **Stripe** — `stripe listen` retained from the previous README.
- **Testing** — `pnpm test:run`, with a note about the global mocks in `src/test/setup.ts`.
- **Deployment** — Vercel + the two scheduled crons in `vercel.json`.
- **Project layout** — directory map.
- **Common issues** — concrete failure modes the team is likely to hit: `500` on every tRPC call (Postgres container stopped — the actual symptom encountered today), Windows Prisma DLL lock, missing OTP, stuck uploads, missing Stripe webhooks.

No production code changed in this pass.

## 2026-05-27 (Wed) — Manual-test enablement for Phase 5

### From the brief

Not in the brief. Follow-up work to make Phase 5 actually testable end-to-end without real third-party credentials.

### Extra

While walking through the Phase 5 chat-PDF export manually, two gaps showed up that blocked the test path on a clean local checkout:

1. **Seeded users had no documents** — the chat panel renders per document, so without a document there was nothing to export. The standalone helper `seed:test-document` was added briefly, then folded back into `seed:test-users` because two seed commands for related fixtures was the wrong split.
2. **`document.get` returned 500** — `fetchPages` calls `getFileBlob(document.fileUrl)`, which hits Supabase. With placeholder dev credentials this throws, the "Loading full summary…" spinner never resolves, and (cosmetically) the document detail view feels broken even though the chat panel underneath is fine.

Changes:

- **`src/scripts/seed-test-users.ts`** — merged the document seeder in. Every seeded user now gets one document with a fully populated `SummaryMetadata` (case number, case title, deponent, deposition date / location, attorneys for both sides) plus a `SummaryAbstract`. Documents use deterministic IDs (`seed_doc_<handle>`) so re-runs are idempotent. The seed prints a summary table + a browser-console snippet that injects six fake chat messages into Zustand's localStorage so the chat panel has content to export.
- **`pnpm seed:test-document`** removed from `package.json`; the standalone file deleted. Single command (`pnpm seed:test-users`) now covers users + orgs + docs + metadata + abstracts + the chat-injection helper.
- **`src/features/summarize/extract/extract.ts`** — wrapped `getFileBlob` in a try/catch. When `USE_TEST_PROVIDERS === "true"` (already set by `pnpm setup:local`) and Supabase fails, log a warning and return `{ pages: [], chunks: [] }` so the rest of the document detail view still renders. Production behaviour is unchanged because `USE_TEST_PROVIDERS` is `"false"` post-deploy. No new env var introduced.
- **`src/scripts/seed-test-users.ts` comments** — full file-level header explaining purpose, idempotency, and what each of the six seed scenarios is testing; JSDoc on every helper (`upsertSeed`, `describeState`, `printChatInjectionSnippet`); inline rationale for the non-obvious bits (deterministic IDs, why the seeder leaves existing documents alone on re-run, why `fileUrl` mirrors the production `{orgId}/{docId}-original.pdf` pattern, why the `USE_TEST_PROVIDERS` fallback is the reason fake `fileUrl` values work).

Production code unchanged except for the localised dev fallback in `fetchPages`. All 157 tests still pass.

The known remaining failure mode — clicking **"Download Summary PDF"** still 500s because that one really does need a real PDF in Supabase storage — is documented in README "Common issues" and not in scope for Phase 5.

## 2026-05-28 (Thu) — Phase 6: Chat Export (Markdown + PDF)

### From the brief

All three todo items closed:

- **Markdown export** — new pure `formatChatAsMarkdown(...)` helper plus `downloadChatAsMarkdown(...)` trigger in `src/features/mail-view/chat-actions.ts`. The Markdown output mirrors the PDF: title line with the file name, italic disclaimer, `## Document` section listing every populated metadata field as a bullet list (rows are omitted entirely when a value is missing — no "—" placeholders that would dirty the rendered markdown), then `## Conversation` with `**You:**` / `**In Depo Veritas AI:**` labels and message bodies, finishing with a horizontal rule + italic "Exported by … on …" footer. Output is `text/markdown`; file name follows the existing `${baseFileName}-chat.md` pattern.
- **PDF export UI alignment with Phase 5** — Phase 5 already shipped the PDF export. Phase 6 added the Markdown button next to it in the same chat toolbar (`Export MD` left of `Export PDF`), wrapped both buttons in a small flex container so the existing Clear (`X`) button stays anchored to the opposite side. Both buttons share the same `variant="ghost"` styling, disabled state (`visibleMessageCount === 0`), and toast error handling.
- **Focused tests** — five new tests in `src/features/mail-view/chat-actions.test.ts` covering `formatChatAsMarkdown`: happy-path output (title, disclaimer, metadata rows, conversation labels, footer); filtering the leading >1000-char assistant message; omitting metadata rows whose values are null; falling back to file-name only when the whole `metadata` row is missing; returning `""` when there are no visible messages.

### Extra

- Brief suggested wrapping the transcript in a code block for "structure"; this was rejected as it would prevent any rendering of user-typed markdown inside questions, and the `**You:**` / `**AI:**` header pattern alone already structures the document cleanly. This is a deliberate deviation, noted here for the record.
- Shared `filterVisibleMessages` between all three export formats (txt, md, pdf) so the "hide initial document-content message" rule stays in lock-step across exports.
- `pnpm types` and `pnpm lint` clean; **162/162 tests passing** (157 before Phase 6).
- Manual verification: open a document → inject the chat fixtures via the snippet from `pnpm seed:test-users` → click `Export MD` → file `<doc>-chat.md` downloads, renders correctly when opened in a Markdown viewer.

### Out of scope

- The brief's Item 4 Sub-feature B also describes a server-side Puppeteer-rendered chat PDF (new `/doc/{id}/chat-export` HTML route + Puppeteer screenshot pipeline). That path was explicitly rejected in Phase 5 in favour of `@react-pdf/renderer` because chat data lives in `localStorage` and a server-side render would require finishing Phase 7 first. Phase 6 inherits that decision — the existing client-side PDF satisfies the "PDF export" half of the todo.

## 2026-05-29 (Fri) — Phase 3: High-priority Code Health

### From the brief

All seven todo items closed. Phase 3 is a sweep of the "high-priority code health" findings from the review (S6, S9, B3, B4, B5, B7, B8).

- **B4 — `admin.cancelJob` removed.** Dead endpoint that threw `"Not implemented"` is gone from the admin router. Locked in by a regression test that introspects `adminRouter._def.procedures`.
- **B5 — `me.discount` removed.** All side effects were commented out; the actual flow lives in `billing.applyDiscountCode`. The endpoint and its hardcoded `TLUJURYBALL` / `#TLUJURYBALL` checks are deleted.
- **B8 — no-op `.map((page) => page)`** in `generate-metadata.ts` removed.
- **B3 — `getActiveOrganization` is now deterministic.** Added `orderBy: { createdAt: "asc" }` so multi-org users get a stable choice at session creation. Previously this was a `findFirst` with no order clause, meaning the "active" org assigned to `Session.activeOrganizationId` could flip arbitrarily and silently change billing context. Doc comment explains the chosen heuristic ("oldest membership wins") and points to a future improvement (store last-active org on the user row).
- **B7 — Organisation trial credit defaults aligned.** `me.update` (onboarding flow) used to grant 0 credits while `organization.createOrganization` granted 1. Both now import `ORGANIZATION_FREE_TRIAL_CREDITS` and `ORGANIZATION_FREE_TRIAL_DAYS` from a new shared module `src/server/utils/organization-defaults.ts`. The reference value is `1` (consistent with `billing.applyDiscountCode`'s "1 default + 10 from discount").
- **S6 — Discount codes externalised.** Removed the hardcoded `["JuryBallVegas2025", "JuryBallFriends"]` from `billing.ts`. Codes now come from a comma-separated `DISCOUNT_CODES` env var. Empty / unset = feature disabled. Reading happens via `process.env` so operators can rotate the list without redeploying and tests can drive scenarios with `vi.stubEnv`. `.env.example` and `create-env.mjs` updated.
- **S9 — Email-domain self-join removed.** The `joinExistingOrganizationId` input on `me.update` is gone, along with the entire server branch that created memberships from a matching domain alone. Joining an existing organisation now happens exclusively through the explicit Invitation flow (`organization.invite` → `organization.acceptInvitation`). The onboarding form was rewritten: the "Join X" auto-join checkbox is replaced with an informational notice ("`<Org>` already uses your email domain — ask an owner to invite you, otherwise create your own organisation below"). `me.get` still returns `availableOrganizations` based on email-domain match, but it is informational only — no endpoint grants access based on it any more.

### Extra

- **T1 cleaned up incidentally** — `UsageStats` in `billing.ts` was typed with the boxed `Number` wrapper instead of the primitive `number`. Fixed while touching that type so the discount tests would compile cleanly.
- **T2 reduced** — both `updateUserData: any` blocks in `me.update` are gone, replaced with a single typed `applyUserFieldUpdates` helper using `Partial<{ name: string; firstName: string }>`. Two duplicated 8-line blocks collapsed to one named function in the process.

### Tests added

- `src/lib/get-active-org.test.ts` — locks in the `orderBy: { createdAt: "asc" }` argument shape (B3).
- `src/server/utils/organization-defaults.test.ts` — locks the shared constants at `1` credit and `14` days (B7).
- `src/server/api/routers/me.test.ts` — verifies `me.update` rejects unauthenticated callers, renames the existing org for an active-org caller, and (crucially) **never reaches into an unrelated organisation** when given the legacy `joinExistingOrganizationId` payload (S9 regression guard).
- `src/server/api/routers/billing.test.ts` — three tests for `applyDiscountCode`: empty env disables the feature, listed codes accepted case-insensitively (and the existing trial is extended with +10 credits as before), unknown codes rejected (S6 regression guard).
- `src/server/api/routers/admin.test.ts` — new "dead code removed" block introspecting `adminRouter._def.procedures` to assert `cancelJob` is no longer registered (B4 regression guard).

**173/173 tests passing**, up from 162 before Phase 3. `pnpm types` and `pnpm lint` clean.

### Effort

Brief estimated ~2 h for Phase 3. Actual was longer because S9 also required the onboarding-form rewrite and a small refactor of the duplicated user-field update blocks. Net code delta is negative on production line count (more lines removed than added).
