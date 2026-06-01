import { db } from "@/lib/db";
import { deleteFile } from "@/lib/supabase-service";
import { runs } from "@trigger.dev/sdk";

export async function deleteDocument(documentId: string) {
  const document = await db.document.findFirstOrThrow({
    where: {
      id: documentId,
    },
  });

  // 1. Delete the associated files
  if (document.fileUrl) {
    try {
      await deleteFile(document.fileUrl);
    } catch (error) {
      console.warn(`Failed to delete file ${document.fileUrl}:`, error);
    }
  }

  if (document.summaryUrl) {
    try {
      await deleteFile(document.summaryUrl);
    } catch (error) {
      console.warn(`Failed to delete file ${document.summaryUrl}:`, error);
    }
  }

  // 2. Cancel any trigger runs
  if (document.triggerId && document.status !== "complete") {
    try {
      await runs.cancel(document.triggerId);
      console.log(`Cancelled trigger run ${document.triggerId}`);
    } catch (error) {
      console.warn(
        `Failed to cancel trigger run ${document.triggerId}:`,
        error,
      );
    }
  }

  // 3-5. Delete associated rows, mark as deleted, and anonymize the name
  await db.$transaction([
    // Delete all summary chunks
    db.summaryChunk.deleteMany({
      where: { documentId },
    }),
    // Delete abstract
    db.summaryAbstract.deleteMany({
      where: { documentId },
    }),
    // Delete metadata
    db.summaryMetadata.deleteMany({
      where: { documentId },
    }),
    // Mark document as deleted and anonymize the name
    db.document.update({
      where: { id: documentId },
      data: {
        deletedAt: new Date(),
        fileName: "[DELETED]",
        status: "deleted",
      },
    }),
  ]);
}
