import { describe, expect, it } from "vitest";

import {
  buildChatPdfData,
  filterVisibleMessages,
  formatChatAsMarkdown,
  formatChatAsText,
} from "./chat-actions";
import { makeChatMessage, makeDocument } from "@/test/factories";
import type { SummaryMetadata } from "@/app/generated/prisma/client";

function makeMetadata(
  overrides: Partial<SummaryMetadata> = {},
): SummaryMetadata {
  return {
    id: "meta_1",
    caseNumber: "CASE-001",
    caseTitle: "Doe v. Roe",
    deponent: "Jane Doe",
    depositionDate: "2026-05-01",
    depositionLocation: "Anytown, USA",
    attorneysForPlaintiff: null,
    attorneysForDefense: null,
    modelProvider: "claude_haiku_4_5",
    timeInMs: 0,
    inputTokenCount: 0,
    outputTokenCount: 0,
    estimatedCost: null,
    documentId: "doc_1",
    createdAt: new Date("2026-05-01T00:00:00Z"),
    updatedAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  } as SummaryMetadata;
}

describe("filterVisibleMessages", () => {
  it("returns [] for an empty input", () => {
    expect(filterVisibleMessages([])).toEqual([]);
  });

  it("drops the leading message when it is an assistant message > 1000 chars", () => {
    const longDocContent = "x".repeat(1500);
    const result = filterVisibleMessages([
      makeChatMessage({ role: "assistant", content: longDocContent }),
      makeChatMessage({ role: "user", content: "Hi" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ role: "user", content: "Hi" });
  });

  it("keeps a short leading assistant message", () => {
    const messages = [
      makeChatMessage({ role: "assistant", content: "Welcome" }),
      makeChatMessage({ role: "user", content: "Hi" }),
    ];
    expect(filterVisibleMessages(messages)).toHaveLength(2);
  });

  it("never drops a leading user message regardless of length", () => {
    const longUserMsg = "u".repeat(2000);
    const messages = [makeChatMessage({ role: "user", content: longUserMsg })];
    expect(filterVisibleMessages(messages)).toEqual(messages);
  });
});

describe("formatChatAsText", () => {
  it("formats visible messages as 'You: …' and 'AI: …' separated by blank lines", () => {
    const out = formatChatAsText([
      makeChatMessage({ role: "user", content: "Who is the deponent?" }),
      makeChatMessage({
        role: "assistant",
        content: "The deponent is Jane Doe.",
      }),
    ]);
    expect(out).toBe(
      "You: Who is the deponent?\n\nAI: The deponent is Jane Doe.",
    );
  });

  it("filters out the leading long assistant message before formatting", () => {
    const out = formatChatAsText([
      makeChatMessage({ role: "assistant", content: "x".repeat(2000) }),
      makeChatMessage({ role: "user", content: "Hi" }),
    ]);
    expect(out).toBe("You: Hi");
  });

  it("returns an empty string for an empty input", () => {
    expect(formatChatAsText([])).toBe("");
  });
});

describe("buildChatPdfData", () => {
  const baseDocument = {
    ...makeDocument({
      fileName: "deposition.pdf",
      createdAt: new Date("2026-05-01T00:00:00Z"),
    }),
    metadata: makeMetadata(),
  };

  it("maps a happy-path conversation into the PDF shape", () => {
    const now = new Date("2026-05-26T10:00:00Z");
    const out = buildChatPdfData({
      messages: [
        makeChatMessage({ role: "user", content: "Who is the deponent?" }),
        makeChatMessage({
          role: "assistant",
          content: "Jane Doe.",
        }),
      ],
      document: baseDocument,
      exportedBy: "Alice Admin",
      now,
    });

    expect(out).toMatchObject({
      appName: "In Depo Veritas",
      exportedBy: "Alice Admin",
      exportedAt: now,
      metadata: {
        fileName: "deposition.pdf",
        documentCreatedAt: baseDocument.createdAt,
        deponent: "Jane Doe",
        caseNumber: "CASE-001",
        caseTitle: "Doe v. Roe",
        depositionDate: "2026-05-01",
        depositionLocation: "Anytown, USA",
      },
      messages: [
        { role: "user", content: "Who is the deponent?" },
        { role: "assistant", content: "Jane Doe." },
      ],
    });
    expect(out.disclaimer).toMatch(/AI-generated transcript/i);
  });

  it("strips the leading long assistant message", () => {
    const out = buildChatPdfData({
      messages: [
        makeChatMessage({ role: "assistant", content: "x".repeat(2000) }),
        makeChatMessage({ role: "user", content: "Hi" }),
      ],
      document: baseDocument,
      exportedBy: "Alice Admin",
    });
    expect(out.messages).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("falls back to nulls when document metadata is missing", () => {
    const out = buildChatPdfData({
      messages: [makeChatMessage({ role: "user", content: "Hi" })],
      document: {
        ...baseDocument,
        metadata: null,
      } as never,
      exportedBy: "Alice Admin",
    });
    expect(out.metadata).toMatchObject({
      deponent: null,
      caseNumber: null,
      caseTitle: null,
      depositionDate: null,
      depositionLocation: null,
    });
  });

  it("yields an empty message list when all messages were filtered out", () => {
    const out = buildChatPdfData({
      messages: [
        makeChatMessage({ role: "assistant", content: "x".repeat(2000) }),
      ],
      document: baseDocument,
      exportedBy: "Alice Admin",
    });
    expect(out.messages).toEqual([]);
  });
});

describe("formatChatAsMarkdown", () => {
  const baseDocument = {
    ...makeDocument({
      fileName: "deposition.pdf",
      createdAt: new Date("2026-05-01T00:00:00Z"),
    }),
    metadata: makeMetadata(),
  };

  it("returns a markdown string with title, metadata block, and labelled transcript", () => {
    const out = formatChatAsMarkdown({
      messages: [
        makeChatMessage({ role: "user", content: "Who is the deponent?" }),
        makeChatMessage({ role: "assistant", content: "Jane Doe." }),
      ],
      document: baseDocument,
      exportedBy: "Alice Admin",
      now: new Date("2026-05-26T10:00:00Z"),
    });

    expect(out).toMatch(/^# Chat transcript — deposition\.pdf/);
    expect(out).toMatch(/AI-generated transcript/i);
    expect(out).toContain("## Document");
    expect(out).toContain("**File name:** deposition.pdf");
    expect(out).toContain("**Deponent:** Jane Doe");
    expect(out).toContain("**Case number:** CASE-001");
    expect(out).toContain("**Case title:** Doe v. Roe");
    expect(out).toContain("## Conversation");
    expect(out).toContain("**You:**");
    expect(out).toContain("Who is the deponent?");
    expect(out).toContain("**In Depo Veritas AI:**");
    expect(out).toContain("Jane Doe.");
    expect(out).toMatch(/_Exported by Alice Admin on /);
  });

  it("filters out the leading long assistant message before formatting", () => {
    const out = formatChatAsMarkdown({
      messages: [
        makeChatMessage({ role: "assistant", content: "x".repeat(2000) }),
        makeChatMessage({ role: "user", content: "Hi" }),
      ],
      document: baseDocument,
      exportedBy: "Alice Admin",
    });
    expect(out).toContain("**You:**");
    expect(out).toContain("Hi");
    expect(out).not.toContain("xxxxxxxx");
  });

  it("omits metadata rows whose values are missing instead of writing dashes", () => {
    const out = formatChatAsMarkdown({
      messages: [makeChatMessage({ role: "user", content: "Hi" })],
      document: {
        ...baseDocument,
        metadata: makeMetadata({
          deponent: null,
          caseNumber: null,
          caseTitle: null,
          depositionDate: null,
          depositionLocation: null,
        }),
      },
      exportedBy: "Alice Admin",
    });
    expect(out).toContain("**File name:** deposition.pdf");
    expect(out).not.toContain("**Deponent:**");
    expect(out).not.toContain("**Case number:**");
    expect(out).not.toContain("**Deposition date:**");
  });

  it("falls back to the file name only when document metadata is null", () => {
    const out = formatChatAsMarkdown({
      messages: [makeChatMessage({ role: "user", content: "Hi" })],
      document: {
        ...baseDocument,
        metadata: null,
      } as never,
      exportedBy: "Alice Admin",
    });
    expect(out).toContain("**File name:** deposition.pdf");
    expect(out).not.toContain("**Deponent:**");
  });

  it("returns an empty string when there are no visible messages", () => {
    const out = formatChatAsMarkdown({
      messages: [
        makeChatMessage({ role: "assistant", content: "x".repeat(2000) }),
      ],
      document: baseDocument,
      exportedBy: "Alice Admin",
    });
    expect(out).toBe("");
  });
});

describe("ChatExportDocument render smoke test", () => {
  it("renders a non-empty PDF buffer starting with the PDF magic bytes", async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const { ChatExportDocument } = await import("./chat-export-pdf");

    const data = buildChatPdfData({
      messages: [
        makeChatMessage({ role: "user", content: "Who is the deponent?" }),
        makeChatMessage({ role: "assistant", content: "Jane Doe." }),
      ],
      document: {
        ...makeDocument({
          fileName: "deposition.pdf",
          createdAt: new Date("2026-05-01T00:00:00Z"),
        }),
        metadata: makeMetadata(),
      },
      exportedBy: "Alice Admin",
      now: new Date("2026-05-26T10:00:00Z"),
    });

    const buffer = await pdf(ChatExportDocument({ data })).toBuffer();
    // toBuffer() returns a Node-readable stream in @react-pdf/renderer v4.
    // Consume into a single Buffer for the magic-bytes check.
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      buffer.on("data", (c: Buffer) => chunks.push(c));
      buffer.on("end", resolve);
      buffer.on("error", reject);
    });
    const out = Buffer.concat(chunks);
    expect(out.length).toBeGreaterThan(100);
    expect(out.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  }, 15_000);
});
