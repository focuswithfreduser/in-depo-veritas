import { DEPO_PAGES_PER_SUMMARY_CHUNK } from "@/config";
import { chunk } from "lodash";

export interface ChunkInfo {
  startPage: number;
  endPage: number;
  pages: string[];
  index: number;
}

// Let's take an example. We see 111 "pages".
// We create chunks of 10 pages each.
// We get 11 chunks.
// the 11th chunk would be the last 1 page, page numbers 111 - 111
// So we'd see:
// { startPage: 1, endPage: 10, pages: [page 1, page 2, page 3, page 4, page 5, page 6, page 7, page 8, page 9, page 10], index: 0 }
// { startPage: 11, endPage: 11, pages: [page 111], index: 10 }
export function getChunks(docPages: string[]) {
  const allChunks: ChunkInfo[] = chunk(
    docPages,
    DEPO_PAGES_PER_SUMMARY_CHUNK,
  ).map((pageChunk, index) => {
    // Calculate sequential start and end page numbers
    const chunkStartIdx = index * DEPO_PAGES_PER_SUMMARY_CHUNK;
    const startPage = chunkStartIdx + 1;
    const endPage = chunkStartIdx + pageChunk.length;

    return {
      startPage,
      endPage,
      pages: pageChunk,
      index,
    };
  });

  return allChunks;
}

export function getExpectedChunkCount(pages: string[]): number {
  return Math.ceil(pages.length / DEPO_PAGES_PER_SUMMARY_CHUNK);
}
