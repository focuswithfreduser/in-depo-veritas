import type { Prisma } from "@/app/generated/prisma";

// Type that matches the structure returned by getDocument function below
export type DocWithRelations = Prisma.DocumentGetPayload<{
  include: {
    metadata: { select: { id: true } };
    abstract: { select: { id: true } };
    _count: {
      select: {
        summaryChunks: true;
      };
    };
  };
}>;

export function calculateStatus(document: DocWithRelations) {
  if (
    document.status !== "processing" ||
    document.expectedChunkCount === null
  ) {
    return { status: document.status, progress: null };
  }

  const totalLLMCalls = document.expectedChunkCount + 2;

  const completedLLMCalls =
    document._count.summaryChunks +
    (document.metadata ? 1 : 0) +
    (document.abstract ? 1 : 0);

  const progress = Math.round((completedLLMCalls / totalLLMCalls) * 100);

  return { status: "processing", progress };
}
