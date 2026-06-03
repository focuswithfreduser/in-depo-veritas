import { extractText } from "unpdf";

const MAX_CHARACTERS_PER_PAGE = 10000;

export async function getPagesFromPDF(buffer: ArrayBuffer): Promise<string[]> {
  const { text } = await extractText(buffer);

  const cleanedPages = text.map((page) => page.replace(/\x00/g, "")); // Remove null bytes

  if (cleanedPages.length === 0) {
    throw new Error("Could not extract any pages from PDF");
  }

  // if any page is longer than MAX_CHARACTERS_PER_PAGE, throw an error
  for (const page of cleanedPages) {
    if (page.length > MAX_CHARACTERS_PER_PAGE) {
      throw new Error("PDF page is too long");
    }
  }

  return cleanedPages.filter((page) => page.trim().length > 0);
}
