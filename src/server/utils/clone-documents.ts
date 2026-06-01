import { db } from "@/lib/db";
import { getFileBlob, uploadFile } from "@/lib/supabase-service";
import { createId } from "@paralleldrive/cuid2";
import path from "path";

export async function cloneDocumentsToWorkspace(
  documentIds: string[],
  targetOrganizationId: string,
  adminUserId: string,
) {
  // 1. Validate document count
  if (documentIds.length > 5) {
    throw new Error("Cannot clone more than 5 documents at a time");
  }

  const documents = await db.document.findMany({
    where: {
      id: { in: documentIds },
      status: "complete",
    },
    include: {
      summaryChunks: true,
      abstract: true,
      metadata: true,
      organization: true,
    },
  });

  if (documents.length === 0) {
    throw new Error("No completed documents found to clone");
  }

  const clonedDocumentIds: string[] = [];

  for (const doc of documents) {
    try {
      const newDocId = createId();

      let newFileUrl: string | null = null;
      let newSummaryUrl: string | null = null;

      if (doc.fileUrl) {
        const fileBlob = await getFileBlob(doc.fileUrl);
        const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
        const fileExtension = path.extname(doc.fileName);
        const newFilePath = `${targetOrganizationId}/${newDocId}-original${fileExtension}`;
        await uploadFile(newFilePath, fileBuffer, doc.fileType);
        newFileUrl = newFilePath;
      }

      if (doc.summaryUrl) {
        const summaryBlob = await getFileBlob(doc.summaryUrl);
        const summaryBuffer = Buffer.from(await summaryBlob.arrayBuffer());
        const newSummaryPath = `${targetOrganizationId}/${newDocId}-summary.pdf`;
        await uploadFile(newSummaryPath, summaryBuffer, "application/pdf");
        newSummaryUrl = newSummaryPath;
      }

      // Create new document with cloned data
      const now = new Date();
      const newDocument = await db.document.create({
        data: {
          id: newDocId,
          organizationId: targetOrganizationId,
          userId: adminUserId,
          fileType: doc.fileType,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          fileUrl: newFileUrl || doc.fileUrl,
          summaryUrl: newSummaryUrl,
          status: doc.status,
          modelProvider: doc.modelProvider,
          pageCount: doc.pageCount,
          relevantStartPage: doc.relevantStartPage,
          relevantEndPage: doc.relevantEndPage,
          expectedChunkCount: doc.expectedChunkCount,
          isArchived: false, // Start unarchived
          createdAt: now,
          updatedAt: now,
          // Omit: orderId, triggerId, publicAccessToken, stripeEventIdentifier
        },
      });

      // Clone summary chunks
      if (doc.summaryChunks.length > 0) {
        await db.summaryChunk.createMany({
          data: doc.summaryChunks.map((chunk) => ({
            documentId: newDocument.id,
            startPage: chunk.startPage,
            endPage: chunk.endPage,
            summary: chunk.summary,
            modelProvider: chunk.modelProvider,
            timeInMs: chunk.timeInMs,
            inputTokenCount: chunk.inputTokenCount,
            outputTokenCount: chunk.outputTokenCount,
            estimatedCost: chunk.estimatedCost,
            isRelevant: chunk.isRelevant,
          })),
        });
      }

      // Clone abstract
      if (doc.abstract) {
        await db.summaryAbstract.create({
          data: {
            documentId: newDocument.id,
            abstract: doc.abstract.abstract,
            modelProvider: doc.abstract.modelProvider,
            timeInMs: doc.abstract.timeInMs,
            inputTokenCount: doc.abstract.inputTokenCount,
            outputTokenCount: doc.abstract.outputTokenCount,
            estimatedCost: doc.abstract.estimatedCost,
          },
        });
      }

      // Clone metadata
      if (doc.metadata) {
        await db.summaryMetadata.create({
          data: {
            documentId: newDocument.id,
            caseNumber: doc.metadata.caseNumber,
            caseTitle: doc.metadata.caseTitle,
            deponent: doc.metadata.deponent,
            depositionDate: doc.metadata.depositionDate,
            depositionLocation: doc.metadata.depositionLocation,
            attorneysForPlaintiff: doc.metadata.attorneysForPlaintiff,
            attorneysForDefense: doc.metadata.attorneysForDefense,
            modelProvider: doc.metadata.modelProvider,
            timeInMs: doc.metadata.timeInMs,
            inputTokenCount: doc.metadata.inputTokenCount,
            outputTokenCount: doc.metadata.outputTokenCount,
            estimatedCost: doc.metadata.estimatedCost,
          },
        });
      }

      clonedDocumentIds.push(newDocument.id);
    } catch (error) {
      console.error(`Failed to clone document ${doc.id}:`, error);
      // Continue with other documents
    }
  }

  return {
    success: true,
    clonedCount: clonedDocumentIds.length,
    clonedDocumentIds,
  };
}
