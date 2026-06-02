#!/usr/bin/env -S npx tsx
//
// Seed REGULAR (non-admin) users, each with their own free-forever
// organisation + owner membership. Idempotent. No admin role is granted.
//
// Local vs production is decided by which env file the npm script loads:
//   pnpm seed:users:local  → .env.local  (local DB)
//   pnpm seed:users:prod   → .env        (production / Supabase)
//
// Two ways to specify the users (combined; duplicates by email are dropped):
//   1. Edit the USERS list below (best for a fixed roster you re-seed often).
//   2. Pass SEED_USERS="email:Full Name,email2" at runtime.
//
// Example:
//   SEED_USERS="jan@firma.com:Jan Kowalski,anna@firma.com" pnpm seed:users:prod

import {
  dedupeByEmail,
  parseUserList,
  upsertUserWithOrg,
  type SeedUser,
} from "./seed-helpers";

// ── Edit with your real users, or leave empty and use SEED_USERS ─────────────
const USERS: SeedUser[] = parseUserList(
  ["jan@firma.com:Jan Kowalski", "anna@firma.com:Anna Nowak"].join(","),
);

(async () => {
  const seeds = dedupeByEmail([
    ...USERS,
    ...parseUserList(process.env.SEED_USERS),
  ]);

  if (seeds.length === 0) {
    console.error("No users to seed. Either:");
    console.error("  - edit the USERS list in src/scripts/seed-users.ts, or");
    console.error('  - pass SEED_USERS="email:Name,email2", e.g.:');
    console.error(
      '    SEED_USERS="jan@firma.com:Jan Kowalski" pnpm seed:users:prod',
    );
    process.exit(1);
  }

  console.log(`Seeding ${seeds.length} user(s)...\n`);

  for (const seed of seeds) {
    const { user, organization } = await upsertUserWithOrg(seed);
    console.log(
      `  ${user.email.padEnd(36)} role=${user.role ?? "user"}  org=${
        organization.name
      }`,
    );
  }

  console.log('\nDone. Check Supabase → Table Editor → "user".');
  process.exit(0);
})().catch((error) => {
  console.error("Failed to seed users:", error);
  process.exit(1);
});
