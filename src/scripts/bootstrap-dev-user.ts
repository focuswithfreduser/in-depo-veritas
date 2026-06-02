#!/usr/bin/env -S npx tsx

import { db } from "@/lib/db";
import { formatEmail } from "@/lib/utils";

const DEV_EMAIL = "dev@local.dev";
const DEV_NAME = "Dev Admin";
const DEV_ORG = "Dev Organization";

(async () => {
  const email = formatEmail(DEV_EMAIL);

  const existingUser = await db.user.findUnique({
    where: { email },
    include: { members: true },
  });

  if (existingUser?.role === "admin" && existingUser.members.length > 0) {
    console.log(`Dev admin already exists: ${email}`);
    console.log("Log in at http://localhost:4049/login");
    console.log("OTP will be printed in the dev server console.");
    return;
  }

  const result = await db.$transaction(async (tx) => {
    const user =
      existingUser ??
      (await tx.user.create({
        data: {
          email,
          name: DEV_NAME,
          firstName: DEV_NAME.split(" ")[0] ?? DEV_NAME,
          emailVerified: true,
          role: "admin",
        },
      }));

    if (user.role !== "admin") {
      await tx.user.update({
        where: { id: user.id },
        data: { role: "admin" },
      });
    }

    let organization = await tx.organization.findFirst({
      where: {
        members: {
          some: { userId: user.id },
        },
      },
    });

    if (!organization) {
      organization = await tx.organization.create({
        data: {
          name: DEV_ORG,
          freeForever: true,
          members: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
        },
      });
    }

    return { user, organization };
  });

  console.log("Created local dev admin user:");
  console.log(`  Email: ${result.user.email}`);
  console.log(`  Organization: ${result.organization.name}`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Run: pnpm dev");
  console.log("  2. Open: http://localhost:4049/login");
  console.log("  3. Enter the email above and request a code");
  console.log("  4. Copy the OTP from the dev server console");
})().catch((error) => {
  console.error("Failed to bootstrap dev user:", error);
  process.exit(1);
});
