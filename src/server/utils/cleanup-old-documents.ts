import { db } from "@/lib/db";
import { deleteDocument } from "./delete-document";

export interface CleanupResult {
  deletedDocuments: number;
  deletedFiles: number;
  errors: string[];
  processedBatches: number;
}

export async function cleanupOldDocuments(
  monthsOld: number = 2,
  batchSize: number = 100,
  processingBatchSize: number = 10,
): Promise<CleanupResult> {
  // Calculate the cutoff date
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

  const results: CleanupResult = {
    deletedDocuments: 0,
    deletedFiles: 0,
    errors: [],
    processedBatches: 0,
  };

  let hasMoreDocuments = true;

  while (hasMoreDocuments) {
    // Find documents older than the cutoff date that haven't been deleted yet
    const oldDocuments = await db.document.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        deletedAt: null, // Only delete documents that haven't been deleted yet
      },
      select: {
        id: true,
        fileUrl: true,
        summaryUrl: true,
        fileName: true,
        createdAt: true,
      },
      take: batchSize,
      orderBy: {
        createdAt: "asc", // Delete oldest first
      },
    });

    if (oldDocuments.length === 0) {
      hasMoreDocuments = false;
      break;
    }

    // Process documents in smaller sub-batches to avoid overwhelming the system
    for (let i = 0; i < oldDocuments.length; i += processingBatchSize) {
      const subBatch = oldDocuments.slice(i, i + processingBatchSize);

      await Promise.all(
        subBatch.map(async (document) => {
          try {
            // Count files that will be deleted for stats
            const filesToDelete =
              (document.fileUrl ? 1 : 0) + (document.summaryUrl ? 1 : 0);

            // Use the shared deleteDocument function
            await deleteDocument(document.id);

            results.deletedDocuments++;
            results.deletedFiles += filesToDelete;
          } catch (error) {
            const errorMessage = `Failed to delete document ${document.id} (${
              document.fileName
            }): ${error instanceof Error ? error.message : String(error)}`;
            console.error(errorMessage);
            results.errors.push(errorMessage);
          }
        }),
      );

      // Small delay between sub-batches to be gentle on the system
      if (i + processingBatchSize < oldDocuments.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    results.processedBatches++;

    // If we got fewer documents than the batch size, we're done
    if (oldDocuments.length < batchSize) {
      hasMoreDocuments = false;
    }

    // Add a longer delay between major batches
    if (hasMoreDocuments) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

export async function getOldDocumentsCount(
  monthsOld: number = 2,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

  return await db.document.count({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
      deletedAt: null, // Only count documents that haven't been deleted yet
    },
  });
}
