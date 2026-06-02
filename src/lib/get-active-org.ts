import { db } from "./db";

/**
 * Returns one organisation the user belongs to.
 *
 * Used at session creation to seed `Session.activeOrganizationId`.
 * Multi-org users must get a STABLE choice — without an explicit orderBy
 * Prisma's findFirst is non-deterministic and the "active" org could flip
 * between logins, silently changing billing context and data visibility.
 *
 * `createdAt asc` = oldest membership wins. The first org the user ever
 * joined stays sticky. (We don't yet track "last active org" on the user
 * row; if/when we do, prefer that.)
 */
export async function getActiveOrganization(userId: string) {
  const organization = await db.organization.findFirst({
    where: {
      members: { some: { userId } },
    },
    orderBy: { createdAt: "asc" },
  });
  return organization;
}
