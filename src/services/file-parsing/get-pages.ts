import mammoth from "mammoth";
import { createPages } from "./create-pages";
import { getPagesFromPDF } from "./get-pages-from-pdf";

enum SupportedFileTypes {
  DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  TXT = "text/plain",
  PDF = "application/pdf",
}

/**
 * Server-side only text extraction from buffers
 * Used for email attachment processing and API routes
 */
export async function getPages(
  buffer: ArrayBuffer,
  contentType: string,
  fileName: string,
): Promise<string[]> {
  // Handle PDF files using pdf2json (server-side only)
  if (contentType === SupportedFileTypes.PDF) {
    const allPages = await getPagesFromPDF(buffer);
    // because of the "mini" format, where 4 pages are placed
    // in very small text on single PDF pages, we still want to
    // "page" using our own home-grown character-based approach.
    return createPages(allPages.join("\n"));
  }

  // Handle DOCX files using mammoth
  if (contentType === SupportedFileTypes.DOCX) {
    // Convert ArrayBuffer to Buffer for mammoth (similar to PDF processing)
    const docxBuffer = Buffer.from(buffer);
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    const text = result.value;
    if (!text || text.length < 10) {
      throw new Error("Failed to extract text from DOCX file");
    }
    return createPages(text);
  }

  // For non-DOCX files, use direct text conversion
  if (contentType === SupportedFileTypes.TXT) {
    // Convert ArrayBuffer to text using TextDecoder
    const text = new TextDecoder().decode(buffer);
    if (!text || text.length < 10) {
      throw new Error(`Content of ${fileName} could not be extracted directly`);
    }
    return createPages(text);
  }

  throw new Error(`Unsupported file type: ${contentType}`);
}
