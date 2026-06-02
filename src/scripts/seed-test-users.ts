#!/usr/bin/env -S npx tsx
//
// Test-user fixture seeder.
// ─────────────────────────
//
// Purpose
//   Populate the local database with a fixed set of users + organisations +
//   documents covering every access-control state introduced in Phase 4, and
//   every metadata field that the Phase 5 chat-PDF export renders.
//
// When to run
//   - After first-time setup (`pnpm setup:local`) to get realistic test data.
//   - Any time you want to reset the fixtures after manual changes — re-running
//     is safe (see "Idempotency" below).
//
// How
//   pnpm seed:test-users
//
// Idempotency
//   - Users are upserted by email.
//   - Organisations are looked up by membership; only created if absent.
//   - Documents use deterministic IDs (`seed_doc_<handle>`); skipped if the row
//     already exists. So re-running won't multiply rows or alter manually
//     edited fields on the seeded docs.
//
// What gets seeded (seven users — six access-control states + one no-org)
//   ┌─────────────────────────────────┬──────────────────────────────────────┐
//   │ User                            │ Expected behaviour                   │
//   ├─────────────────────────────────┼──────────────────────────────────────┤
//   │ alice.active                    │ Logs in normally. Primary happy path.│
//   │ eve.trial                       │ Logs in normally. accessExpiresAt    │
//   │                                 │ +7 days. "Time-limited" badge.       │
//   │ frank.expired-trial             │ Login allowed by Better Auth, but    │
//   │                                 │ every tRPC call rejected by the      │
//   │                                 │ access-expiry middleware. "Access    │
//   │                                 │ expired" badge in admin.             │
//   │ bob.suspended-temp              │ Login rejected with BANNED_USER.     │
//   │                                 │ banExpires +7 days. "Suspended"      │
//   │                                 │ badge with lift date.                │
//   │ carol.suspension-lapsed         │ Login allowed: banExpires is in the  │
//   │                                 │ past, Better Auth + cron auto-clear  │
//   │                                 │ on next session/sweep.               │
//   │ dave.banned                     │ Login rejected with BANNED_USER.     │
//   │                                 │ No expiry — admin must unsuspend.    │
//   └─────────────────────────────────┴──────────────────────────────────────┘
//
//   Plus a seventh user — newcomer.no-org@example.test — that deliberately has
//   NO organisation and NO document. It exercises the Phase 3 / review-S9
//   onboarding flow: after logging in (request an OTP; the code is printed in
//   the dev-server console) the user lands on /onboarding. Because Active Org
//   already owns the shared `example.test` email domain, me.get returns it in
//   `availableOrganizations`, so the onboarding form shows the invitation-only
//   notice ("ask an owner to invite you") — NOT the auto-join checkbox that S9
//   removed. Completing setup creates a brand-new org for the user; it never
//   silently joins Active Org. (To re-test, delete the org/membership this flow
//   created — or delete the user — then re-run this script.)
//
//   Every user except newcomer gets one fully-populated document (case number,
//   deponent, attorneys, abstract) so the Phase 5 chat-PDF export has real
//   values to render in its metadata grid.
//
// Chat data
//   Chat lives in browser `localStorage` (Zustand persist), not in the database,
//   so we can't seed it server-side. To get chat messages into the panel for
//   manual testing, run this script and copy the chat-injection snippet it
//   prints at the end — paste it in the browser DevTools console, then reload.

import { db } from "@/lib/db";
import { formatEmail } from "@/lib/utils";

type DocumentFixture = {
  id: string;
  fileName: string;
  caseNumber: string;
  caseTitle: string;
  deponent: string;
  depositionDate: string;
  depositionLocation: string;
  attorneysForPlaintiff: string;
  attorneysForDefense: string;
  pageCount: number;
  abstract: string;
};

type Seed = {
  /** Short slug used to build deterministic IDs (e.g. `seed_doc_alice`). */
  handle: string;
  email: string;
  name: string;

  /**
   * Name of the organisation to create for this user (with an owner
   * membership). Omit it to seed a user with NO organisation — used by the
   * `newcomer` fixture to exercise the S9 onboarding flow. A user with no org
   * cannot own a document, so `document` must also be omitted in that case.
   */
  orgName?: string;

  /**
   * If set, the user's organisation claims this email domain. Idempotent — the
   * `domain` column is globally unique. Used so the `newcomer` user (whose
   * email shares this domain) sees the invitation-only onboarding notice (S9)
   * instead of the auto-join checkbox that Phase 3 removed.
   */
  claimsDomain?: string;

  // ─── Suspension (negative restriction) ─────────────────────────────────
  // Mirrors Better Auth's banExpires semantics: user is blocked NOW, access
  // is restored at banExpires. `banExpires: null` + `banned: true` is a
  // permanent suspension. Used by the "Suspend User" admin dialog.
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;

  // ─── Access grant (positive restriction) ───────────────────────────────
  // Opposite of a ban: user HAS access until accessExpiresAt, then loses it.
  // Used by the "Set Access Expiry" admin dialog and the demo-trial use case.
  accessExpiresAt?: Date | null;

  /** Optional document fixture; if absent, the user is created without one. */
  document?: Omit<DocumentFixture, "id"> & { id?: string };
};

const day = 24 * 60 * 60 * 1000;
const now = Date.now();

const SEEDS: Seed[] = [
  // ─── Primary happy-path user ──────────────────────────────────────────────
  // No restrictions. Use this account for the chat-PDF export smoke test:
  //   1. Log in as alice
  //   2. Open smith-deposition.pdf
  //   3. Paste the chat-injection snippet printed at the end of this script
  //   4. Reload, then click "Export PDF" in the chat toolbar
  {
    handle: "alice",
    email: "alice.active@example.test",
    name: "Alice Active",
    orgName: "Active Org",
    // Active Org claims the shared example.test domain so the org-less
    // `newcomer` user (same domain) hits the S9 invitation-only notice during
    // onboarding instead of being able to auto-join. See the `newcomer` seed.
    claimsDomain: "example.test",
    document: {
      fileName: "smith-deposition.pdf",
      caseNumber: "2026-CV-00481",
      caseTitle: "Smith v. Acme Corporation",
      deponent: "John P. Smith",
      depositionDate: "March 12, 2026",
      depositionLocation: "Chicago, IL",
      attorneysForPlaintiff: "Jane Roe, Esq.",
      attorneysForDefense: "Mark Doe, Esq.",
      pageCount: 42,
      abstract:
        "Mr. Smith testified regarding the events of January 5, 2026, including his recollection of the meeting at Acme's office and the subsequent communications.",
    },
  },

  // ─── Access-grant scenarios (Phase 4: positive restriction) ───────────────

  // Active trial — has access UNTIL the date. Use to verify the "Time-limited"
  // badge in the admin user table and that the user can use the app normally
  // while the grant is in effect.
  {
    handle: "eve",
    email: "eve.trial@example.test",
    name: "Eve Trial",
    orgName: "Trial Org",
    accessExpiresAt: new Date(now + 7 * day),
    document: {
      fileName: "wilson-deposition.pdf",
      caseNumber: "2026-CV-00892",
      caseTitle: "Wilson v. State Trucking Co.",
      deponent: "Karen Wilson",
      depositionDate: "April 3, 2026",
      depositionLocation: "Houston, TX",
      attorneysForPlaintiff: "Sarah Black, Esq.",
      attorneysForDefense: "Tom Green, Esq.",
      pageCount: 28,
      abstract:
        "Ms. Wilson described the highway incident of November 2025 and her subsequent medical treatment over six months.",
    },
  },

  // Expired trial — accessExpiresAt is in the past. Login via Better Auth
  // succeeds (Better Auth doesn't know about this field), but every tRPC
  // call is rejected by the access-expiry middleware in protectedProcedure.
  // Admin table should show the red "Access expired" badge.
  {
    handle: "frank",
    email: "frank.expired-trial@example.test",
    name: "Frank Expired-Trial",
    orgName: "Expired Trial Org",
    accessExpiresAt: new Date(now - 1 * day),
    document: {
      fileName: "johnson-deposition.pdf",
      caseNumber: "2025-CV-09124",
      caseTitle: "Johnson v. MedCorp",
      deponent: "Dr. Robert Johnson",
      depositionDate: "October 18, 2025",
      depositionLocation: "Boston, MA",
      attorneysForPlaintiff: "Linda White, Esq.",
      attorneysForDefense: "Paul Adams, Esq.",
      pageCount: 67,
      abstract:
        "Dr. Johnson explained the standard of care applied during the May 2024 procedure and addressed the plaintiff's allegations point by point.",
    },
  },

  // ─── Suspension scenarios (Phase 4: negative restriction) ─────────────────

  // Active suspension with a future banExpires. Login is rejected by Better
  // Auth with BANNED_USER. The "Suspend User" admin dialog should let an
  // admin unsuspend or change the date. Cron is a no-op for this row (the
  // ban hasn't expired yet).
  {
    handle: "bob",
    email: "bob.suspended-temp@example.test",
    name: "Bob Suspended-Temp",
    orgName: "Temp Suspended Org",
    banned: true,
    banReason: "Policy review",
    banExpires: new Date(now + 7 * day),
    document: {
      fileName: "garcia-deposition.pdf",
      caseNumber: "2026-CV-00112",
      caseTitle: "Garcia v. City of Anytown",
      deponent: "Maria Garcia",
      depositionDate: "February 8, 2026",
      depositionLocation: "Anytown, CA",
      attorneysForPlaintiff: "David Lee, Esq.",
      attorneysForDefense: "Emily Brown, Esq.",
      pageCount: 35,
      abstract:
        "Ms. Garcia recounted the events of the September 2025 incident at the municipal building and identified two witnesses by name.",
    },
  },

  // Suspension that already lapsed. Demonstrates the auto-clear paths:
  //   - Better Auth clears `banned/banExpires` on next session creation
  //   - The protectedProcedure fallback clears it lazily on any tRPC call
  //   - The hourly cron sweeps it even if the user never returns
  // Useful for confirming the cleanup flow works.
  {
    handle: "carol",
    email: "carol.suspension-lapsed@example.test",
    name: "Carol Suspension-Lapsed",
    orgName: "Suspension Lapsed Org",
    banned: true,
    banReason: "Old suspension",
    banExpires: new Date(now - 1 * day),
    document: {
      fileName: "kim-deposition.pdf",
      caseNumber: "2025-CV-07788",
      caseTitle: "Kim v. TechStartup Inc.",
      deponent: "Daniel Kim",
      depositionDate: "August 22, 2025",
      depositionLocation: "San Francisco, CA",
      attorneysForPlaintiff: "Rachel Stone, Esq.",
      attorneysForDefense: "Michael Park, Esq.",
      pageCount: 51,
      abstract:
        "Mr. Kim, the founder of TechStartup Inc., explained the equity terms granted to the plaintiff during the 2024 hiring negotiation.",
    },
  },

  // Permanent ban: banned=true with banExpires=null. Login is rejected
  // forever until an admin unsuspends. Used to verify that the cron does
  // NOT touch this row (no expiry to sweep) and that the admin badge
  // reads "Suspended" with no date.
  {
    handle: "dave",
    email: "dave.banned@example.test",
    name: "Dave Banned",
    orgName: "Permanently Banned Org",
    banned: true,
    banReason: "Permanent suspension",
    banExpires: null,
    document: {
      fileName: "lee-deposition.pdf",
      caseNumber: "2024-CV-04412",
      caseTitle: "Lee v. Heritage Bank",
      deponent: "Patricia Lee",
      depositionDate: "December 4, 2024",
      depositionLocation: "Atlanta, GA",
      attorneysForPlaintiff: "Christopher Hall, Esq.",
      attorneysForDefense: "Nina Patel, Esq.",
      pageCount: 22,
      abstract:
        "Ms. Lee described her account history with Heritage Bank and the unauthorised transfers identified in the disputed period.",
    },
  },

  // ─── No-organisation user (Phase 3 / review S9: onboarding flow) ───────────
  // Has NO org and NO document. On login (request an OTP — the code prints in
  // the dev-server console) the user lands on /onboarding. Because Active Org
  // already owns the shared `example.test` domain, me.get returns it in
  // `availableOrganizations`, so the onboarding form shows the invitation-only
  // notice — proving the S9 fix: there is no auto-join checkbox, and completing
  // setup creates a brand-new org rather than silently joining Active Org.
  // Re-running the seed will NOT remove an org the user created during the
  // test; to reset, delete that org/membership (or the user) and re-run.
  {
    handle: "newcomer",
    email: "newcomer.no-org@example.test",
    name: "Newcomer No-Org",
    // orgName intentionally omitted → no organisation, and therefore no
    // document. This is what forces the /onboarding flow on first login.
  },
];

/**
 * Upsert a single seed: user → organisation → document (+ metadata + abstract).
 *
 * Runs in a transaction so a failure mid-way leaves nothing partially created.
 * Each entity has its own idempotency rule (see inline comments).
 */
async function upsertSeed(seed: Seed) {
  const email = formatEmail(seed.email);
  // Deterministic document ID so re-running the seed is a no-op for documents.
  // Falls back to `seed_doc_<handle>` if the seed doesn't override it.
  const docId = seed.document?.id ?? `seed_doc_${seed.handle}`;

  return db.$transaction(async (tx) => {
    // 1. User — keyed by email. On re-run we refresh the access-control fields
    //    only (we don't reset name/firstName in case someone edited them).
    const user = await tx.user.upsert({
      where: { email },
      create: {
        email,
        name: seed.name,
        firstName: seed.name.split(" ")[0] ?? seed.name,
        emailVerified: true,
        banned: seed.banned ?? false,
        banReason: seed.banReason ?? null,
        banExpires: seed.banExpires ?? null,
        accessExpiresAt: seed.accessExpiresAt ?? null,
      },
      update: {
        banned: seed.banned ?? false,
        banReason: seed.banReason ?? null,
        banExpires: seed.banExpires ?? null,
        accessExpiresAt: seed.accessExpiresAt ?? null,
      },
    });

    // 2. Organisation — only for users that declare an `orgName`. Looked up by
    //    membership rather than by name, so admins can rename the org via the
    //    UI without the seed re-creating it. `freeForever: true` skips the
    //    trial / subscription gates so the user can use the app immediately
    //    (relevant for alice + eve who can log in). Users without an `orgName`
    //    (e.g. `newcomer`) are intentionally left org-less so they hit the
    //    /onboarding flow on first login (the S9 test).
    let organization: { id: string; name: string } | null = null;
    if (seed.orgName) {
      const existingOrg = await tx.organization.findFirst({
        where: { members: { some: { userId: user.id } } },
      });

      organization =
        existingOrg ??
        (await tx.organization.create({
          data: {
            name: seed.orgName,
            freeForever: true,
            members: { create: { userId: user.id, role: "owner" } },
          },
        }));

      // Optionally claim the email domain for this org. Idempotent: the
      // `domain` column is globally unique, so we upsert keyed by domain. A
      // claimed domain makes the org show up in me.get's
      // `availableOrganizations` for any same-domain user, which is what
      // surfaces the S9 invitation-only notice for `newcomer`.
      if (seed.claimsDomain) {
        await tx.domain.upsert({
          where: { domain: seed.claimsDomain },
          create: {
            organizationId: organization.id,
            domain: seed.claimsDomain,
            updatedAt: new Date(),
          },
          update: { updatedAt: new Date() },
        });
      }
    }

    // 3. Document — idempotent by deterministic id. We do NOT update an
    //    existing seeded document; if a tester or QA edits fields by hand
    //    we leave their edits in place. To force a refresh, delete the row
    //    manually and re-run.
    //
    //    fileUrl / summaryUrl point to Supabase paths that don't exist in
    //    local dev. That's intentional:
    //      - fetchPages() degrades to empty pages when USE_TEST_PROVIDERS=true
    //        (see src/features/summarize/extract/extract.ts) so document.get
    //        still works for the chat UI.
    //      - "Download Summary PDF" will still 500 — it needs a real bucket.
    //        That's outside Phase 5 scope.
    let document: { id: string; fileName: string } | null = null;
    if (organization && seed.document) {
      const existingDoc = await tx.document.findUnique({
        where: { id: docId },
        select: { id: true, fileName: true },
      });

      if (existingDoc) {
        document = existingDoc;
      } else {
        document = await tx.document.create({
          data: {
            id: docId,
            organizationId: organization.id,
            userId: user.id,
            fileType: "application/pdf",
            fileName: seed.document.fileName,
            fileSize: 1_234_567,
            // Path mirrors the production format `{orgId}/{docId}-original.pdf`
            // so the IDOR ownership check in document.getSignedPDFUrl matches.
            fileUrl: `${organization.id}/${docId}-original.pdf`,
            status: "complete",
            pageCount: seed.document.pageCount,
            summaryUrl: `${organization.id}/${docId}-summary.pdf`,
            // SummaryMetadata + SummaryAbstract are 1:1 child rows. Both are
            // displayed in the chat-export PDF header, so we populate every
            // optional field with realistic values to fully exercise the
            // metadata grid on export.
            metadata: {
              create: {
                caseNumber: seed.document.caseNumber,
                caseTitle: seed.document.caseTitle,
                deponent: seed.document.deponent,
                depositionDate: seed.document.depositionDate,
                depositionLocation: seed.document.depositionLocation,
                attorneysForPlaintiff: seed.document.attorneysForPlaintiff,
                attorneysForDefense: seed.document.attorneysForDefense,
                modelProvider: "claude_haiku_4_5",
                // Token/time/cost stats are fake-but-plausible — never read
                // in tests, but the columns are NOT NULL so we have to fill them.
                timeInMs: 12_345,
                inputTokenCount: 5_000,
                outputTokenCount: 1_200,
                estimatedCost: 0.04,
              },
            },
            abstract: {
              create: {
                abstract: seed.document.abstract,
                modelProvider: "claude_haiku_4_5",
                timeInMs: 5_678,
                inputTokenCount: 2_500,
                outputTokenCount: 400,
                estimatedCost: 0.015,
              },
            },
          },
          select: { id: true, fileName: true },
        });
      }
    }

    return { user, organization, document };
  });
}

/**
 * Build a one-line human description of a user's effective access state.
 * Output is purely cosmetic — appears in the seed's summary table to make
 * it obvious at a glance what each fixture represents.
 *
 * Two independent dimensions can stack:
 *   - banned + banExpires  →  SUSPENDED / SUSPENSION LAPSED / PERMANENTLY SUSPENDED
 *   - accessExpiresAt      →  TIME-LIMITED / ACCESS EXPIRED
 * A user can have both simultaneously (although none of the SEEDS do).
 */
function describeState(user: {
  banned: boolean | null;
  banExpires: Date | null;
  accessExpiresAt: Date | null;
}): string {
  const parts: string[] = [];
  if (user.banned) {
    if (user.banExpires) {
      const lifted = user.banExpires.getTime() < Date.now();
      parts.push(
        lifted
          ? `SUSPENSION LAPSED (since ${user.banExpires
              .toISOString()
              .slice(0, 10)})`
          : `SUSPENDED until ${user.banExpires.toISOString().slice(0, 10)}`,
      );
    } else {
      parts.push("PERMANENTLY SUSPENDED");
    }
  }
  if (user.accessExpiresAt) {
    const expired = user.accessExpiresAt.getTime() <= Date.now();
    parts.push(
      expired
        ? `ACCESS EXPIRED (since ${user.accessExpiresAt
            .toISOString()
            .slice(0, 10)})`
        : `TIME-LIMITED until ${user.accessExpiresAt
            .toISOString()
            .slice(0, 10)}`,
    );
  }
  if (parts.length === 0) parts.push("ACTIVE");
  return parts.join(" + ");
}

/**
 * Generate the JavaScript snippet you paste into the browser DevTools console
 * to load a fake six-message conversation into the Zustand chat store.
 *
 * Why this is needed
 *   Chat messages live in `localStorage` (see src/stores/chat-store.ts) — not
 *   in the database — so the seeder cannot put them there directly. Without
 *   a real Anthropic API key, running the chat live would also fail. The
 *   injection snippet is the shortest path to "chat panel has messages → the
 *   Export PDF toolbar appears → you can verify Phase 5 end-to-end".
 *
 * Storage shape
 *   The Zustand persist key is `indepoveritas-chat-storage`. The snippet
 *   reads the existing payload (if any), merges in a new chat under the
 *   given documentId, and writes it back. After paste + reload, the AIChat
 *   component picks the messages up via `useChatStore.loadChat(documentId)`.
 */
function printChatInjectionSnippet(documentId: string, deponent: string) {
  const snippet = `(() => {
  const documentId = ${JSON.stringify(documentId)};
  const t = Date.now();
  const messages = [
    { id: "m1", role: "user", content: "Who is the deponent in this case?", timestamp: t },
    { id: "m2", role: "assistant", content: "The deponent is ${deponent}.", timestamp: t + 1 },
    { id: "m3", role: "user", content: "Summarise their testimony in two sentences.", timestamp: t + 2 },
    { id: "m4", role: "assistant", content: "${deponent} testified regarding the key events at issue in this matter. They were questioned on specific dates, communications, and the sequence of events leading up to the dispute.", timestamp: t + 3 },
    { id: "m5", role: "user", content: "Did they identify any other witnesses?", timestamp: t + 4 },
    { id: "m6", role: "assistant", content: "Yes — they referenced multiple individuals by name who were present at the relevant meetings. Full names and roles appear in the deposition record.", timestamp: t + 5 },
  ];
  const key = "indepoveritas-chat-storage";
  const raw = localStorage.getItem(key);
  const parsed = raw ? JSON.parse(raw) : { state: { chats: {} }, version: 0 };
  parsed.state.chats[documentId] = { documentId, messages, lastUpdated: t };
  localStorage.setItem(key, JSON.stringify(parsed));
  console.log("Chat injected for", documentId, "— reload the page and open the document.");
})();`;

  return snippet;
}

// ── Main ───────────────────────────────────────────────────────────────────
// Sequentially process every seed so failures point to a specific user, then
// print a summary table + the chat-injection snippet for the happy-path user.
(async () => {
  console.log("Seeding test users + documents...\n");

  const results: {
    seed: Seed;
    user: Awaited<ReturnType<typeof upsertSeed>>["user"];
    organization: Awaited<ReturnType<typeof upsertSeed>>["organization"];
    document: Awaited<ReturnType<typeof upsertSeed>>["document"];
  }[] = [];

  // Sequential (not Promise.all) so any failure halts cleanly with the
  // offending email in the stack trace, and re-running picks up where we left.
  for (const seed of SEEDS) {
    const r = await upsertSeed(seed);
    results.push({ seed, ...r });
  }

  // Summary table
  for (const r of results) {
    const state = describeState(r.user);
    const orgPart = r.organization
      ? `org=${r.organization.name}`
      : "org=— (onboarding)";
    const docPart = r.document ? `doc=${r.document.id}` : "doc=—";
    console.log(
      `  ${r.user.email.padEnd(40)} [${state}]  ${orgPart}  ${docPart}`,
    );
  }

  // Chat-injection snippet for the primary happy-path user (alice).
  const alice = results.find((r) => r.seed.handle === "alice" && r.document);
  if (alice?.document) {
    console.log("");
    console.log("─".repeat(72));
    console.log(
      `Chat injection snippet for ${alice.user.email} → ${alice.document.fileName}`,
    );
    console.log("─".repeat(72));
    console.log(
      "To populate the chat panel, log in as the user above, open the document,",
    );
    console.log(
      "open DevTools → Console, paste the snippet, then reload the page.",
    );
    console.log("");
    console.log(
      printChatInjectionSnippet(
        alice.document.id,
        alice.seed.document!.deponent,
      ),
    );
    console.log("");
    console.log(
      "(For other users: copy the snippet, change `documentId` to their doc id from the table above.)",
    );
  }

  console.log("");
  console.log("Done. Open http://localhost:4049/app/mail after logging in.");
})().catch((error) => {
  console.error("Failed to seed test users:", error);
  process.exit(1);
});
