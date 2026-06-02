#!/usr/bin/env -S npx tsx
//
// Seed an ADMIN user (+ optionally some regular users), each with their own
// free-forever organisation. Idempotent.
//
// Local vs production is decided by which env file the npm script loads:
//   pnpm seed:admin:local  → .env.local  (local DB)
//   pnpm seed:admin:prod   → .env        (production / Supabase)
//
// Required env:
//   ADMIN_EMAIL  – the admin's email (the account you log in with)
//
// Optional env:
//   ADMIN_NAME   – defaults to a title-cased version of the email local part
//   ADMIN_ORG    – defaults to "<name>'s Organization"
//   SEED_USERS   – extra (non-admin) users, "email:Full Name" comma-separated
//
// Example:
//   ADMIN_EMAIL="you@firm.com" pnpm seed:admin:prod

import {
  dedupeByEmail,
  nameFromEmail,
  parseUserList,
  upsertUserWithOrg,
  type SeedUser,
} from "./seed-helpers";

(async () => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) {
    console.error("ADMIN_EMAIL is required. Example:\n");
    console.error('  ADMIN_EMAIL="you@firm.com" pnpm seed:admin:prod');
    process.exit(1);
  }

  const adminName = process.env.ADMIN_NAME?.trim() || nameFromEmail(adminEmail);

  const seeds: SeedUser[] = dedupeByEmail([
    {
      email: adminEmail,
      name: adminName,
      admin: true,
      orgName: process.env.ADMIN_ORG?.trim() || `${adminName}'s Organization`,
    },
    ...parseUserList(process.env.SEED_USERS),
  ]);

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
  console.log("");
  console.log('To log in (/login): enter the email, click "Send verification');
  console.log('code", then get the 6-digit code from your inbox (Resend) or —');
  console.log('before Resend is verified — from the "verification" table');
  console.log('(column "value") for the row whose "identifier" is that email.');

  process.exit(0);
})().catch((error) => {
  console.error("Failed to seed admin/users:", error);
  process.exit(1);
});
