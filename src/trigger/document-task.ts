import { screenshotInNext } from "@/features/create-summaries/screenshot/screenshot-nextjs";
import {
  deductMeteredUsage,
  updateMeteredUsage,
} from "@/features/summarize/metering";
import { summarizeDocument } from "@/features/summarize/summarize-document";
import { DocumentStatus } from "@/app/generated/prisma";
import { db } from "@/lib/db";
import { ensureError } from "@/lib/utils";
import { maybeSendEmail } from "@/emails/utils";
import { logger, queue, task, tasks } from "@trigger.dev/sdk";

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
    await updateMeteredUsage(payload.documentId);

    const response = await summarizeDocument(payload.documentId, ctx.run.id);
    logger.debug(`Summarized document ${payload.documentId}`);

    // The PDF screenshot is a downloadable export, not the summary itself. The
    // summary content (chunks + abstract) is already generated above, so a
    // screenshot failure (e.g. headless Chromium on Vercel) must not fail the
    // whole document or leave it stuck before "complete". On failure we still
    // mark it complete, just without a summaryUrl/PDF. (BUG-001)
    try {
      await screenshotInNext(payload.documentId);
    } catch (screenshotError) {
      const err = ensureError(screenshotError);
      logger.error(
        `Screenshot failed for ${payload.documentId} (continuing without PDF): ${err.message}`,
      );
      await db.document.update({
        where: { id: payload.documentId },
        data: { status: DocumentStatus.complete },
      });
    }

    if (!payload.skipEmail) {
      await maybeSendEmail(payload.documentId);
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
