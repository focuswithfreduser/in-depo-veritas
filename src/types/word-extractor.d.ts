declare module "word-extractor" {
  /** Accessors onto the extracted text of a parsed Word document. */
  interface WordDocument {
    getBody(): string;
    getFootnotes(): string;
    getHeaders(): string;
    getFooters(): string;
    getAnnotations(): string;
    getEndnotes(): string;
  }

  /**
   * Reads legacy binary `.doc` (OLE compound) and `.docx` (OOXML) Word files
   * and exposes their text. Detects the format from the file's magic bytes.
   */
  class WordExtractor {
    extract(source: string | Buffer): Promise<WordDocument>;
  }

  export = WordExtractor;
}
