import { db } from "@/lib/db";

export async function hasAdminPermission(userId: string) {
  const currentUser = await db.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
  });

  if (currentUser.role !== "admin") {
    throw new Error("User does not have admin permission");
  }
}
