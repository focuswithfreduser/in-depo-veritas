import { db } from "@/lib/db";

export async function resetDocument(documentId: string) {
  await db.document.update({
    where: { id: documentId },
    data: {
      summaryUrl: null,
      status: "pending",
      relevantStartPage: null,
      relevantEndPage: null,
      pageCount: null,
      expectedChunkCount: null,
    },
  });

  await db.summaryChunk.deleteMany({
    where: { documentId },
  });

  await db.summaryAbstract.deleteMany({
    where: { documentId },
  });

  await db.summaryMetadata.deleteMany({
    where: { documentId },
  });
}
