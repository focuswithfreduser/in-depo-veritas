import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import { createPages } from "./create-pages";
import { getPagesFromPDF } from "./get-pages-from-pdf";

enum SupportedFileTypes {
  DOC = "application/msword",
  DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  TXT = "text/plain",
  PDF = "application/pdf",
}

/**
 * Resolve the file type from the stored MIME type, falling back to the file
 * extension. Some browsers report an empty or generic MIME for legacy `.doc`
 * uploads, so the extension is a reliable secondary signal.
 */
function resolveFileType(
  contentType: string,
  fileName: string,
): SupportedFileTypes | null {
  switch (contentType) {
    case SupportedFileTypes.PDF:
      return SupportedFileTypes.PDF;
    case SupportedFileTypes.DOCX:
      return SupportedFileTypes.DOCX;
    case SupportedFileTypes.DOC:
      return SupportedFileTypes.DOC;
    case SupportedFileTypes.TXT:
      return SupportedFileTypes.TXT;
  }

  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf")) return SupportedFileTypes.PDF;
  if (lowerName.endsWith(".docx")) return SupportedFileTypes.DOCX;
  if (lowerName.endsWith(".doc")) return SupportedFileTypes.DOC;
  if (lowerName.endsWith(".txt")) return SupportedFileTypes.TXT;

  return null;
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
  const fileType = resolveFileType(contentType, fileName);

  // Handle PDF files using pdf2json (server-side only)
  if (fileType === SupportedFileTypes.PDF) {
    const allPages = await getPagesFromPDF(buffer);
    // because of the "mini" format, where 4 pages are placed
    // in very small text on single PDF pages, we still want to
    // "page" using our own home-grown character-based approach.
    return createPages(allPages.join("\n"));
  }

  // Handle modern .docx files using mammoth
  if (fileType === SupportedFileTypes.DOCX) {
    // Convert ArrayBuffer to Buffer for mammoth (similar to PDF processing)
    const docxBuffer = Buffer.from(buffer);
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    const text = result.value;
    if (!text || text.length < 10) {
      throw new Error("Failed to extract text from DOCX file");
    }
    return createPages(text);
  }

  // Handle legacy binary .doc files (Word 97-2003) using word-extractor.
  // mammoth only reads the .docx (OOXML) format, so the old OLE-based .doc
  // needs a dedicated parser.
  if (fileType === SupportedFileTypes.DOC) {
    const docBuffer = Buffer.from(buffer);
    const extracted = await new WordExtractor().extract(docBuffer);
    const text = extracted.getBody();
    if (!text || text.length < 10) {
      throw new Error("Failed to extract text from DOC file");
    }
    return createPages(text);
  }

  // For plain-text files, use direct text conversion
  if (fileType === SupportedFileTypes.TXT) {
    // Convert ArrayBuffer to text using TextDecoder
    const text = new TextDecoder().decode(buffer);
    if (!text || text.length < 10) {
      throw new Error(`Content of ${fileName} could not be extracted directly`);
    }
    return createPages(text);
  }

  throw new Error(`Unsupported file type: ${contentType}`);
}
