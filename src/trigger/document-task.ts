import { screenshotInNext } from "@/features/create-summaries/screenshot/screenshot-nextjs";
import {
  deductMeteredUsage,
  updateMeteredUsage,
} from "@/features/summarize/metering";
import { summarizeDocument } from "@/features/summarize/summarize-document";
import { db } from "@/lib/db";
import { ensureError } from "@/lib/utils";
import { maybeSendEmail } from "@/emails/utils";
import { logger, queue, task, tasks } from "@trigger.dev/sdk";

// Define queue first
const documentQueue = queue({
  name: "document-queue",
  concurrencyLimit: 5,
});

export const documentTask = task({
  id: "document",
  queue: documentQueue,
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 60 * 60, // Stop executing after 3600 secs (1 hour) of compute
  run: async (
    payload: { documentId: string; skipEmail?: boolean },
    { ctx },
  ) => {
    console.log(`Summarizing file ${payload.documentId}`);

    await updateMeteredUsage(payload.documentId);

    // To rule out OOM, for now you could use this code in a setTimeout to keep logging the memory out:
    setTimeout(() => {
      const memory = process.memoryUsage();
      console.log("Memory usage", {
        rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memory.external / 1024 / 1024)}MB`,
        arrayBuffers: `${Math.round(memory.arrayBuffers / 1024 / 1024)}MB`,
      });
    }, 1000);

    const response = await summarizeDocument(payload.documentId, ctx.run.id);

    logger.debug(`Summarized file ${payload.documentId}`);

    logger.debug(`Summarized file ${payload.documentId}`);

    console.log("🎥 Starting screenshot 🎥");

    await screenshotInNext(payload.documentId);
    console.log("📸 Screenshot complete 📸");

    if (!payload.skipEmail) {
      await maybeSendEmail(payload.documentId);
    } else {
      console.log(
        `Skipping email for document ${payload.documentId} (admin trigger)`,
      );
    }

    return response;
  },
  onFailure: async ({ payload, error }) => {
    const err = ensureError(error);
    logger.error(`Error summarizing file ${payload.documentId} ${err.message}`);

    const doc = await db.document.update({
      where: { id: payload.documentId },
      data: {
        status: "failed",
      },
    });

    await deductMeteredUsage(doc);
  },
});

export async function triggerDocument(documentId: string, skipEmail?: boolean) {
  const handle = await tasks.trigger<typeof documentTask>(
    "document",
    {
      documentId,
      skipEmail,
    },
    {},
    {
      publicAccessToken: {
        expirationTime: "24hr",
      },
    },
  );

  return handle;
}
