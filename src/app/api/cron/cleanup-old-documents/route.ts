import { NextRequest, NextResponse } from "next/server";
import {
  cleanupOldDocuments,
  getOldDocumentsCount,
} from "@/server/utils/cleanup-old-documents";

export const maxDuration = 300;

// This endpoint should only be called by Vercel cron jobs
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel cron
  const authHeader = request.headers.get("authorization");
  const expectedHeader = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expectedHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check how many documents would be affected
    const oldDocumentsCount = await getOldDocumentsCount(2);
    console.log(
      `Found ${oldDocumentsCount} documents older than 2 months to delete`,
    );

    if (oldDocumentsCount === 0) {
      return NextResponse.json({
        message: "No documents to delete",
        deletedDocuments: 0,
        deletedFiles: 0,
        errors: [],
        processedBatches: 0,
      });
    }

    // Run the cleanup with appropriate batch sizes
    // For cron jobs, use smaller batches to avoid timeouts
    const results = await cleanupOldDocuments(
      2, // 2 months old
      50, // batch size for database queries
      5, // processing batch size for concurrent operations
    );

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 2);

    return NextResponse.json({
      message: "Cleanup completed",
      ...results,
      cutoffDate: cutoffDate.toISOString(),
      totalDocumentsFound: oldDocumentsCount,
    });
  } catch (error) {
    console.error("Error during document cleanup:", error);
    return NextResponse.json(
      {
        error: "Internal server error during cleanup",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
