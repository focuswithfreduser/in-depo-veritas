#!/usr/bin/env -S npx tsx

import { db } from "@/lib/db";

async function normalizeExistingEmails() {
  if (process.env.NEXT_RUNTIME) {
    throw new Error(
      "This script should never be called from within the Next.js application.",
    );
  }

  // Get all users
  const users = await db.user.findMany({
    select: { id: true, email: true },
  });

  const conflicts: string[] = [];
  const updates: { id: string; oldEmail: string; newEmail: string }[] = [];

  for (const user of users) {
    const normalizedEmail = user.email.toLowerCase().trim();

    if (normalizedEmail !== user.email) {
      // Check if normalized email would conflict
      const existingUser = await db.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id: user.id },
        },
      });

      if (existingUser) {
        conflicts.push(
          `CONFLICT: ${user.email} (id: ${user.id}) would conflict with ${existingUser.email} (id: ${existingUser.id})`,
        );
      } else {
        updates.push({
          id: user.id,
          oldEmail: user.email,
          newEmail: normalizedEmail,
        });
      }
    }
  }

  // Report conflicts
  if (conflicts.length > 0) {
    console.log("\nCONFLICTS DETECTED - Manual resolution required:");
    conflicts.forEach((c) => console.log(c));
    console.log("\nResolve conflicts before running updates.\n");
  }

  // Report planned updates
  console.log(`\nPlanned updates: ${updates.length}`);
  updates.forEach((u) => console.log(`  ${u.oldEmail} -> ${u.newEmail}`));

  // DRY RUN by default
  if (process.env.APPLY_UPDATES !== "true") {
    console.log(
      "\nDRY RUN - No changes made. Set APPLY_UPDATES=true to apply.\n",
    );
    return;
  }

  // Apply updates
  console.log("\nApplying updates...");
  for (const update of updates) {
    await db.user.update({
      where: { id: update.id },
      data: { email: update.newEmail },
    });
    console.log(`  Updated ${update.oldEmail} -> ${update.newEmail}`);
  }

  // Also normalize invitations
  const invitations = await db.invitation.findMany({
    select: { id: true, email: true },
  });

  for (const invitation of invitations) {
    const normalizedEmail = invitation.email.toLowerCase().trim();
    if (normalizedEmail !== invitation.email) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { email: normalizedEmail },
      });
      console.log(`  Invitation: ${invitation.email} -> ${normalizedEmail}`);
    }
  }

  // Also normalize verification identifiers
  const verifications = await db.verification.findMany({
    select: { id: true, identifier: true },
  });

  for (const verification of verifications) {
    const normalizedIdentifier = verification.identifier.toLowerCase().trim();
    if (normalizedIdentifier !== verification.identifier) {
      await db.verification.update({
        where: { id: verification.id },
        data: { identifier: normalizedIdentifier },
      });
      console.log(
        `  Verification: ${verification.identifier} -> ${normalizedIdentifier}`,
      );
    }
  }

  console.log("\nMigration complete!\n");
}

normalizeExistingEmails().catch(console.error);
