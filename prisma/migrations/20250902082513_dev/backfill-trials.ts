import { PrismaClient } from "@/app/generated/prisma";
import { addDays } from "date-fns";

const prisma = new PrismaClient();

// After applying the sibling schema changes, existing organizations are not backed by
// a Trial entity yet.
async function main() {
  await prisma.$transaction(
    async (tx) => {
      for (const org of await tx.organization.findMany({
        include: { trial: true },
      })) {
        if (org.trial !== null) {
          console.log(
            `Trial with id '${org.trial.id}' already exists for organization '${org.id}', skipping.`,
          );
          continue;
        }

        const updatedOrg = await tx.organization.update({
          where: { id: org.id },
          data: {
            trial: {
              create: { endsAt: addDays(org.createdAt, 14) },
            },
          },
          include: {
            trial: true,
          },
        });

        console.log(
          `Backfilled trial with id '${
            updatedOrg.trial!.id
          }' for organization '${updatedOrg.id}'.`,
        );
      }
    },
    {
      timeout: 60000,
    },
  );
  console.log("Applied data migration with no errors.");
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
