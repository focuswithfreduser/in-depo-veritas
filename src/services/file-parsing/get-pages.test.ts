import { describe, expect, it, vi } from "vitest";

// Stub the binary parsers so these tests stay fast and isolated — we only
// care about the routing logic in getPages, not the parser internals.
vi.mock("word-extractor", () => ({
  default: class {
    extract() {
      return Promise.resolve({
        getBody: () =>
          "Extracted body text from a legacy .doc deposition file.",
      });
    }
  },
}));

vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn(async () => ({
      value: "Extracted text from a modern .docx deposition file.",
    })),
  },
}));

vi.mock("./get-pages-from-pdf", () => ({
  getPagesFromPDF: vi.fn(async () => ["pdf page one", "pdf page two"]),
}));

import { getPages } from "./get-pages";

const buffer = new ArrayBuffer(8);

describe("getPages — file type routing (BUG-002: legacy .doc)", () => {
  it("extracts legacy .doc via word-extractor when MIME is application/msword", async () => {
    const pages = await getPages(
      buffer,
      "application/msword",
      "deposition.doc",
    );
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.join("")).toContain("legacy .doc deposition");
  });

  it("resolves .doc from the file extension when the MIME is empty", async () => {
    const pages = await getPages(buffer, "", "deposition.doc");
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.join("")).toContain("legacy .doc deposition");
  });

  it("still routes .docx to mammoth", async () => {
    const pages = await getPages(
      buffer,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "deposition.docx",
    );
    expect(pages.join("")).toContain("modern .docx deposition");
  });

  it("throws for genuinely unsupported file types", async () => {
    await expect(
      getPages(buffer, "application/zip", "mystery.bin"),
    ).rejects.toThrow(/Unsupported file type/);
  });
});
