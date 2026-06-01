import { db } from "@/lib/db";
import { getFileBlob, uploadFile } from "@/lib/supabase-service";
import zipFiles from "@/services/zip";

export async function createDocumentsZip(
  documentIds: string[],
  organizationId: string,
): Promise<string> {
  // Get documents that belong to the organization and have summaries
  const documents = await db.document.findMany({
    where: {
      id: { in: documentIds },
      organizationId,
      status: "complete",
      summaryUrl: { not: null },
      deletedAt: null, // Exclude deleted documents
    },
    select: {
      id: true,
      fileName: true,
      summaryUrl: true,
    },
  });

  if (documents.length === 0) {
    throw new Error("No valid documents found for ZIP creation");
  }

  // Track failed file IDs for files that couldn't be processed
  const allFailedFileIds: string[] = [];

  // Process files one at a time to reduce memory usage
  const zipFileContents: { name: string; content: string }[] = [];

  // Process each file sequentially
  for (const document of documents) {
    if (!document.summaryUrl) {
      allFailedFileIds.push(document.id);
      continue;
    }

    try {
      // Download file from Supabase storage using the service helper
      const fileData = await getFileBlob(document.summaryUrl);

      // Convert blob to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const base64Content = Buffer.from(arrayBuffer).toString("base64");

      // Add to ZIP contents with clean filename
      const cleanFileName =
        document.fileName.replace(/\.[^/.]+$/, "") + "-summary.pdf";
      zipFileContents.push({
        name: cleanFileName,
        content: base64Content,
      });
    } catch (error) {
      console.error(`Failed to process file ${document.fileName}:`, error);
      allFailedFileIds.push(document.id);
    }
  }

  if (zipFileContents.length === 0) {
    throw new Error("No files could be processed for ZIP creation");
  }

  // Create ZIP file
  const zipBase64 = await zipFiles(zipFileContents);
  const zipBuffer = Buffer.from(zipBase64, "base64");

  // Upload ZIP to Supabase storage with unique filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const zipFileName = `${organizationId}/summaries-${timestamp}.zip`;

  const data = await uploadFile(zipFileName, zipBuffer, "application/zip");

  return data.path;
}
