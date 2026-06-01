import { Document } from "@/app/generated/prisma/client";
import { getChunks } from "@/features/summarize/extract/get-chunks";
import { db } from "@/lib/db";
import { getFileBlob } from "@/lib/supabase-service";
import { getPages } from "@/services/file-parsing/get-pages";

export async function fetchPages(document: Document) {
  const fileBlob = await getFileBlob(document.fileUrl);
  const arrayBuffer = await fileBlob.arrayBuffer();
  let pages = await getPages(arrayBuffer, document.fileType, document.fileName);

  if (document.relevantStartPage && document.relevantEndPage) {
    pages = pages.slice(
      document.relevantStartPage - 1,
      document.relevantEndPage,
    );
  }
  const chunks = getChunks(pages);

  return { pages, chunks };
}

export async function extractPages(document: Document) {
  const { pages, chunks } = await fetchPages(document);

  await db.document.update({
    where: { id: document.id },
    data: {
      expectedChunkCount: chunks.length,
      pageCount: pages.length,
      status: "processing",
    },
  });
  return { chunks, pages };
}
