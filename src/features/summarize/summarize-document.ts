import { DocumentStatus, SummaryChunk } from "@/app/generated/prisma/client";
import generateAbstract from "@/features/summarize/generate-abstract";
import generateChunk from "@/features/summarize/generate-chunk";
import generateMetadata from "@/features/summarize/generate-metadata";
import { db } from "@/lib/db";
import { extractPages } from "./extract/extract";

export async function summarizeDocument(
  documentId: string,
  triggerId?: string,
): Promise<{ documentId: string }> {
  const document = await db.document.findFirstOrThrow({
    where: { id: documentId },
    include: {
      summaryChunks: {
        orderBy: { startPage: "asc" },
      },
      metadata: true,
      abstract: true,
    },
  });

  if (triggerId) {
    await db.document.update({
      where: { id: documentId },
      data: {
        triggerId,
        status: DocumentStatus.processing,
      },
    });
  }

  const { pages, chunks } = await extractPages(document);

  // Generate metadata if it doesn't exist
  if (!document.metadata) {
    console.log(`${documentId} generating metadata`);
    await generateMetadata(documentId, document.modelProvider, pages);
  } else {
    console.log(`${documentId} metadata already exists`);
  }

  const todo = chunks.filter((chunk) => {
    const existingSummary = document.summaryChunks.find(
      (sum) =>
        sum.startPage === chunk.startPage && sum.endPage === chunk.endPage,
    );
    return !existingSummary;
  });

  if (todo.length === 0) {
    console.log(`${documentId} no chunks remaining to summarize`);
  }

  // Keep track of all chunks (existing + new) in memory
  const generatedChunks: SummaryChunk[] = [...document.summaryChunks];

  for (const chunk of todo) {
    console.log(
      `${documentId} generating chunk ${chunk.startPage}-${chunk.endPage}`,
    );
    const newChunk = await generateChunk(
      document,
      chunk.startPage,
      chunk.endPage,
      generatedChunks,
      document.modelProvider,
      pages,
    );
    generatedChunks.push(newChunk);
    // Sort chunks by startPage to maintain order
    generatedChunks.sort((a, b) => a.startPage - b.startPage);
  }

  // Generate abstract if it doesn't exist
  if (!document.abstract) {
    console.log(`${documentId} generating abstract`);
    await generateAbstract(
      documentId,
      document.modelProvider,
      generatedChunks, // Use our in-memory chunks instead of fetching again
    );
  } else {
    console.log(`${documentId} abstract already exists`);
  }

  console.log(`${documentId} completed`);

  await db.document.update({
    where: { id: documentId },
    data: {
      status: DocumentStatus.finalizing,
    },
  });

  return { documentId };
}
