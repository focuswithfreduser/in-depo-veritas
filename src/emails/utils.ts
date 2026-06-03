import "server-only";

import { REPLY_TO_EMAIL, SEND_FROM } from "@/config";
import { db } from "@/lib/db";
import { sendEmail } from "@/services/email/resend";
import { getSummaryReadyParams } from "@/emails/user/summary-ready";

/**
 * Checks if an email should be sent when a document is completed.
 * Only sends email if:
 * 1. User has shouldEmailOnComplete set to true
 * 2. No other documents for this user are still being processed
 */
export async function maybeSendEmail(documentId: string): Promise<void> {
  try {
    // Get the document with user data
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: {
        user: true,
      },
    });

    if (!document?.user) {
      return;
    }

    // Check if user wants email notifications
    if (!document.user.shouldEmailOnComplete) {
      return;
    }

    // Check if any other documents for this user are still being processed (only from the last day)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const hasProcessingDocuments = await db.document.count({
      where: {
        userId: document.userId,
        id: { not: documentId },
        createdAt: { gte: oneDayAgo },
        status: {
          in: ["uploading", "pending", "processing", "finalizing"],
        },
      },
    });

    if (hasProcessingDocuments > 0) {
      return;
    }

    // All conditions met - send the notification email
    const { html, text } = await getSummaryReadyParams();

    await sendEmail(
      document.user.email,
      SEND_FROM,
      "Your deposition summary is ready",
      html,
      text,
      null,
      REPLY_TO_EMAIL,
    );
  } catch (error) {
    console.error(`Failed to send email for document ${documentId}:`, error);
    // Don't throw - we don't want email failures to break document processing
  }
}
