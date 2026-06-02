// Shared helpers for the seed scripts (seed-admin.ts, seed-users.ts).
// Kept dependency-light on purpose: only `@/lib/db` (lazy Prisma client) and
// the pure `formatEmail` helper, so seeders run with just POSTGRES_PRISMA_URL
// in the environment — no full create-env validation required.

import { db } from "@/lib/db";
import { formatEmail } from "@/lib/utils";

export type SeedUser = {
  email: string;
  name: string;
  admin: boolean;
  orgName: string;
};

/** "jane.q-doe" → "Jane Q Doe"; falls back to the raw email if empty. */
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const pretty = local
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return pretty || email;
}

/**
 * Parse a "email:Full Name, email2" list into SeedUsers.
 * `admin` flags whether the parsed users should be created as admins (the
 * regular-user seeder always passes false).
 */
export function parseUserList(
  raw: string | undefined,
  admin = false,
): SeedUser[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [emailPart, ...nameParts] = entry.split(":");
      const email = emailPart.trim();
      const name = nameParts.join(":").trim() || nameFromEmail(email);
      return { email, name, admin, orgName: `${name}'s Organization` };
    });
}

/** Drop duplicate emails (case-insensitive), keeping the first occurrence. */
export function dedupeByEmail(users: SeedUser[]): SeedUser[] {
  const seen = new Set<string>();
  return users.filter((u) => {
    const key = u.email.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Upsert one user (by email) and ensure they own a free-forever organisation
 * with an owner membership. Idempotent: re-running won't duplicate the org
 * (it's looked up by membership), and only promotes role to admin on re-run.
 * Mirrors the shape used by admin.inviteUser so seeded rows behave like
 * app-created accounts.
 */
export async function upsertUserWithOrg(seed: SeedUser) {
  const email = formatEmail(seed.email);

  return db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: {
        email,
        name: seed.name,
        firstName: seed.name.split(" ")[0] ?? seed.name,
        emailVerified: true,
        role: seed.admin ? "admin" : null,
      },
      update: seed.admin ? { role: "admin" } : {},
    });

    let organization = await tx.organization.findFirst({
      where: { members: { some: { userId: user.id } } },
      select: { id: true, name: true },
    });

    if (!organization) {
      organization = await tx.organization.create({
        data: {
          name: seed.orgName,
          freeForever: true,
          members: { create: { userId: user.id, role: "owner" } },
        },
        select: { id: true, name: true },
      });
    }

    return { user, organization };
  });
}
