import { db } from "./db";

export async function getActiveOrganization(userId: string) {
  const organization = await db.organization.findFirst({
    where: {
      members: { some: { userId } },
    },
  });
  return organization;
}
