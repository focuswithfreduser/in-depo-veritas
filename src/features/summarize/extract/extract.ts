import { Document } from "@/app/generated/prisma/client";
import { env } from "@/create-env.mjs";
import { getChunks } from "@/features/summarize/extract/get-chunks";
import { db } from "@/lib/db";
import { getFileBlob } from "@/lib/supabase-service";
import { getPages } from "@/services/file-parsing/get-pages";

export async function fetchPages(document: Document) {
  let arrayBuffer: ArrayBuffer;
  try {
    const fileBlob = await getFileBlob(document.fileUrl);
    arrayBuffer = await fileBlob.arrayBuffer();
  } catch (err) {
    // In dev/test, Supabase credentials are placeholders and seed documents
    // point to file paths that don't exist. Degrade gracefully so the rest
    // of the UI (chat panel, metadata, abstract) still works.
    if (env.USE_TEST_PROVIDERS === "true") {
      console.warn(
        `[fetchPages] USE_TEST_PROVIDERS=true: returning empty pages for ${document.id} (${document.fileUrl}). Underlying error:`,
        err instanceof Error ? err.message : err,
      );
      return { pages: [], chunks: [] };
    }
    throw err;
  }

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
