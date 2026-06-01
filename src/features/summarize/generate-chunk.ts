import { ModelProvider, SummaryChunk } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { calculateCost } from "@/services/llm/cost";
import { SummaryWithChunksAndFile } from "@/types";
import { generateObject } from "ai";
import pRetry from "p-retry";
import { z } from "zod";
import { getModelForProvider } from "./models";
import { buildLegalSummaryPrompt } from "./prompts";

const INCLUDED_PREVIOUS_CHUNKS_COUNT = 10;

const chunkSummarySchema = z.object({
  isRelevant: z.boolean(),
  summary: z.string(),
});

export default async function generateChunk(
  summary: SummaryWithChunksAndFile,
  startPage: number,
  endPage: number,
  existingChunks: SummaryChunk[],
  modelProvider: ModelProvider,
  depoPages: string[],
): Promise<SummaryChunk> {
  // Create a Set of requested page numbers for O(1) lookup
  // Include one page before and after for LLM context (if they exist)
  const contextStartPage = Math.max(1, startPage - 1);
  const contextEndPage = Math.min(depoPages.length, endPage + 1);
  const requestedPageSet = new Set(
    Array.from(
      { length: contextEndPage - contextStartPage + 1 },
      (_, i) => contextStartPage + i,
    ),
  );

  const pages = depoPages.filter((page, index) =>
    requestedPageSet.has(index + 1),
  );

  // Join the text of all pages in this chunk
  const asString = pages.join("\n");

  // Get previous chunks from our in-memory array
  const previousChunks = existingChunks
    .filter((chunk) => chunk.startPage < startPage)
    .sort((a, b) => b.startPage - a.startPage)
    .slice(0, INCLUDED_PREVIOUS_CHUNKS_COUNT);

  const previousSummaries = previousChunks.length
    ? previousChunks.map((chunk) => chunk.summary).join(" ")
    : undefined;

  const prompt = buildLegalSummaryPrompt(asString, previousSummaries);

  const model = getModelForProvider(modelProvider);

  const resp = await pRetry(
    async () => {
      return await generateObject({
        model,
        prompt,
        schema: chunkSummarySchema,
      });
    },
    {
      retries: 3,
      minTimeout: 60000, // 1 minute
      factor: 1, // No exponential backoff, keep flat 1 minute wait
    },
  );

  // If content is not relevant, set summary to empty string
  const finalSummary = resp.object.isRelevant ? resp.object.summary : "";

  const data = {
    summary: finalSummary,
    timeInMs: resp.usage.totalTokens ?? 0,
    inputTokenCount: resp.usage.inputTokens ?? 0,
    outputTokenCount: resp.usage.outputTokens ?? 0,
    estimatedCost: calculateCost(
      modelProvider,
      resp.usage.inputTokens ?? 0,
      resp.usage.outputTokens ?? 0,
    ),
    isRelevant: resp.object.isRelevant,
    startPage: startPage,
    endPage: endPage,
  };

  // Create or update the chunk in the database
  const chunk = await db.summaryChunk.upsert({
    create: {
      ...data,
      modelProvider: modelProvider,
      document: {
        connect: {
          id: summary.id,
        },
      },
    },
    update: data,
    where: {
      documentId_startPage_endPage: {
        documentId: summary.id,
        startPage: data.startPage,
        endPage: data.endPage,
      },
    },
  });

  return chunk;
}
