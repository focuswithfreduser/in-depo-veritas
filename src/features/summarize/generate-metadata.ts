import { ModelProvider } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { calculateCost } from "@/services/llm/cost";
import { generateObject } from "ai";
import pRetry from "p-retry";
import { getModelForProvider } from "./models";
import { METADATA_PROMPT } from "./prompts";
import { MetadataSchema } from "./types";

export default async function generateMetadata(
  summaryRequestId: string,
  modelProvider: ModelProvider,
  pages: string[],
) {
  const model = getModelForProvider(modelProvider);

  const initialPages = pages
    .slice(0, 15)
    .map((page) => page)
    .join("\n\n");

  const start = Date.now();
  const resp = await pRetry(
    async () => {
      return await generateObject({
        model,
        messages: [
          {
            role: "system",
            content: METADATA_PROMPT,
          },
          {
            role: "user",
            content: initialPages,
          },
        ],
        schema: MetadataSchema,
      });
    },
    {
      retries: 3,
      minTimeout: 60000, // 1 minute
      factor: 1, // No exponential backoff, keep flat 1 minute wait
      onFailedAttempt: (error) => {
        console.log(
          `Metadata generation attempt ${error.attemptNumber} failed. Waiting 60 seconds before retry...`,
        );
        console.log(`Error: ${error.message}`);
      },
    },
  );

  const timeInMs = Date.now() - start;

  const estimatedCost = calculateCost(
    modelProvider,
    resp.usage.inputTokens ?? 0,
    resp.usage.outputTokens ?? 0,
  );

  await db.summaryMetadata.upsert({
    where: {
      id: summaryRequestId,
    },
    update: {
      ...resp.object,
    },
    create: {
      ...resp.object,
      modelProvider: modelProvider,
      document: {
        connect: {
          id: summaryRequestId,
        },
      },
      estimatedCost,
      inputTokenCount: resp.usage.inputTokens ?? 0,
      outputTokenCount: resp.usage.outputTokens ?? 0,
      timeInMs,
    },
  });
}
