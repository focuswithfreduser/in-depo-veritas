import { db } from "@/lib/db";
import { deleteDocument } from "./delete-document";

export async function deleteUser(userId: string) {
  // 1. Fetch user data with all documents and memberships
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      documents: {
        select: {
          id: true,
        },
      },
      members: {
        include: {
          organization: {
            include: {
              members: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // 2. Identify organizations where user is the only member
  const organizationsToDelete: string[] = [];
  for (const member of user.members) {
    // Check if this organization has only one member (this user)
    if (member.organization.members.length === 1) {
      organizationsToDelete.push(member.organization.id);
    }
  }

  // 3. Delete organizations where user is sole member
  // This will cascade delete: domains, members, invitations, documents, subscriptions
  // Do this first so if it fails, we haven't deleted documents yet
  if (organizationsToDelete.length > 0) {
    try {
      await db.organization.deleteMany({
        where: {
          id: { in: organizationsToDelete },
        },
      });
    } catch (error) {
      console.warn(`Failed to delete organizations for user ${userId}:`, error);
      throw error; // Re-throw as this is critical
    }
  }

  // 4. Delete all user documents
  // Do this after organizations but before user deletion
  // If this fails, we still have the user record for debugging
  for (const document of user.documents) {
    try {
      await deleteDocument(document.id);
    } catch (error) {
      // Log error but continue with deletion
      console.warn(
        `Failed to delete document ${document.id} for user ${userId}:`,
        error,
      );
    }
  }

  // 5. Delete verification codes (manual deletion, not in schema relations)
  try {
    await db.verification.deleteMany({
      where: { identifier: user.email },
    });
  } catch (error) {
    console.warn(
      `Failed to delete verification codes for user ${userId}:`,
      error,
    );
  }

  // 6. Delete user record
  // Cascades will automatically handle:
  // - Sessions (cascade via schema line 52)
  // - Accounts (cascade via schema line 66)
  // - Members in shared organizations (cascade via schema line 134)
  // - Invitations sent by user (cascade via schema line 151)
  await db.user.delete({
    where: { id: userId },
  });
}
