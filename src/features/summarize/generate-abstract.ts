import { ModelProvider, SummaryChunk } from "@/app/generated/prisma/client";

import { generateText } from "ai";
import pRetry from "p-retry";
import { getModelForProvider } from "./models";
import { getAbstractPrompt } from "./prompts";

import { db } from "@/lib/db";
import { calculateCost } from "@/services/llm/cost";

// TODO: is this actually a good number?
const MAX_SUMMARY_CHUNKS_FOR_ABSTRACT = 100;

export default async function generateAbstract(
  summaryRequestId: string,
  modelProvider: ModelProvider,
  summaryChunks: SummaryChunk[],
) {
  if (summaryChunks.length === 0) {
    throw new Error("No summary chunks provided");
  }

  const model = getModelForProvider(modelProvider);
  const summary = summaryChunks
    .slice(0, MAX_SUMMARY_CHUNKS_FOR_ABSTRACT)
    .map((chunk) => chunk.summary)
    .join("\n\n");

  const prompt = getAbstractPrompt(summary);
  const start = Date.now();

  const resp = await pRetry(
    async () => {
      return await generateText({
        model,
        prompt,
      });
    },
    {
      retries: 3,
      minTimeout: 60000, // 1 minute
      factor: 1, // No exponential backoff, keep flat 1 minute wait
    },
  );

  await db.summaryAbstract.upsert({
    where: {
      id: summaryRequestId,
    },
    update: {
      abstract: resp.text,
    },
    create: {
      abstract: resp.text,
      modelProvider: modelProvider,
      document: {
        connect: {
          id: summaryRequestId,
        },
      },
      id: summaryRequestId,
      timeInMs: Date.now() - start,
      inputTokenCount: resp.usage.inputTokens ?? 0,
      outputTokenCount: resp.usage.outputTokens ?? 0,
      estimatedCost: calculateCost(
        modelProvider,
        resp.usage.inputTokens ?? 0,
        resp.usage.outputTokens ?? 0,
      ),
    },
  });
}
