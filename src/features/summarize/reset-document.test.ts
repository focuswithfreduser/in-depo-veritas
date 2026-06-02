import { describe, expect, it } from "vitest";

import { resetDocument } from "@/features/summarize/reset-document";
import { dbMock } from "@/test/mocks/db";

describe("resetDocument", () => {
  it("clears summary state on the document and removes derived rows", async () => {
    dbMock.document.update.mockResolvedValue({} as never);
    dbMock.summaryChunk.deleteMany.mockResolvedValue({ count: 0 } as never);
    dbMock.summaryAbstract.deleteMany.mockResolvedValue({ count: 0 } as never);
    dbMock.summaryMetadata.deleteMany.mockResolvedValue({ count: 0 } as never);

    await resetDocument("doc_42");

    expect(dbMock.document.update).toHaveBeenCalledWith({
      where: { id: "doc_42" },
      data: {
        summaryUrl: null,
        status: "pending",
        relevantStartPage: null,
        relevantEndPage: null,
        pageCount: null,
        expectedChunkCount: null,
      },
    });

    expect(dbMock.summaryChunk.deleteMany).toHaveBeenCalledWith({
      where: { documentId: "doc_42" },
    });
    expect(dbMock.summaryAbstract.deleteMany).toHaveBeenCalledWith({
      where: { documentId: "doc_42" },
    });
    expect(dbMock.summaryMetadata.deleteMany).toHaveBeenCalledWith({
      where: { documentId: "doc_42" },
    });
  });
});
