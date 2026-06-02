import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateObject } from "ai";

import { ModelProvider } from "@/app/generated/prisma/client";
import generateChunk from "@/features/summarize/generate-chunk";
import type { SummaryWithChunksAndFile } from "@/types";
import { dbMock } from "@/test/mocks/db";
import { makeChunk, makeDocument } from "@/test/factories";

vi.mock("@/features/summarize/models", () => ({
  getModelForProvider: vi.fn(() => ({ id: "fake-model" })),
}));

function buildSummary(
  overrides: Partial<SummaryWithChunksAndFile> = {},
): SummaryWithChunksAndFile {
  return {
    ...makeDocument({ id: "doc_chunk" }),
    summaryChunks: [],
    ...overrides,
  } as SummaryWithChunksAndFile;
}

function mockGenerateObject(args: {
  isRelevant: boolean;
  summary: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  vi.mocked(generateObject).mockResolvedValue({
    object: { isRelevant: args.isRelevant, summary: args.summary },
    usage: {
      inputTokens: args.inputTokens ?? 100,
      outputTokens: args.outputTokens ?? 50,
    },
  } as never);
}

beforeEach(() => {
  dbMock.summaryChunk.upsert.mockResolvedValue(makeChunk() as never);
});

describe("generateChunk", () => {
  const depoPages = Array.from(
    { length: 20 },
    (_, i) => `Page ${i + 1} content`,
  );

  it("sends only the requested pages (with ±1 context) to the model", async () => {
    mockGenerateObject({ isRelevant: true, summary: "Summary text" });

    await generateChunk(
      buildSummary(),
      /* startPage */ 5,
      /* endPage */ 7,
      [],
      ModelProvider.claude_haiku_4_5,
      depoPages,
    );

    expect(generateObject).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(generateObject).mock.calls[0]![0] as {
      prompt: string;
    };
    // Context spans pages 4..8 (5-1 .. 7+1).
    expect(arg.prompt).toContain("Page 4 content");
    expect(arg.prompt).toContain("Page 5 content");
    expect(arg.prompt).toContain("Page 7 content");
    expect(arg.prompt).toContain("Page 8 content");
    expect(arg.prompt).not.toContain("Page 3 content");
    expect(arg.prompt).not.toContain("Page 9 content");
  });

  it("clamps the context window at page 1 for the first chunk", async () => {
    mockGenerateObject({ isRelevant: true, summary: "x" });

    await generateChunk(
      buildSummary(),
      1,
      3,
      [],
      ModelProvider.claude_haiku_4_5,
      depoPages,
    );

    const arg = vi.mocked(generateObject).mock.calls[0]![0] as {
      prompt: string;
    };
    expect(arg.prompt).toContain("Page 1 content");
    expect(arg.prompt).toContain("Page 4 content"); // +1 context
    // No "Page 0" or "Page -1" leaking in (would break upstream).
    expect(arg.prompt).not.toContain("Page 0 content");
  });

  it("clamps the context window at the last page", async () => {
    mockGenerateObject({ isRelevant: true, summary: "x" });

    await generateChunk(
      buildSummary(),
      19,
      20,
      [],
      ModelProvider.claude_haiku_4_5,
      depoPages,
    );

    const arg = vi.mocked(generateObject).mock.calls[0]![0] as {
      prompt: string;
    };
    expect(arg.prompt).toContain("Page 20 content");
    expect(arg.prompt).not.toContain("Page 21 content");
  });

  it("includes up to 10 previous chunks (most recent first)", async () => {
    mockGenerateObject({ isRelevant: true, summary: "x" });

    // 15 previous chunks; only the 10 most recent (by startPage desc) should
    // appear in the prompt.
    // Use a unique sentinel-ended marker so e.g. "[chunk-1]" is NOT a
    // substring of "[chunk-15]".
    const previous = Array.from({ length: 15 }, (_, i) =>
      makeChunk({
        startPage: i + 1,
        endPage: i + 1,
        summary: `[chunk-${i + 1}]`,
      }),
    );

    await generateChunk(
      buildSummary({ summaryChunks: previous }),
      20,
      20,
      previous,
      ModelProvider.claude_haiku_4_5,
      depoPages,
    );

    const arg = vi.mocked(generateObject).mock.calls[0]![0] as {
      prompt: string;
    };
    expect(arg.prompt).toContain("[chunk-15]");
    expect(arg.prompt).toContain("[chunk-6]"); // 10th most recent
    expect(arg.prompt).not.toContain("[chunk-5]"); // 11th — excluded
    expect(arg.prompt).not.toContain("[chunk-1]");
  });

  it("ignores chunks whose startPage >= the current startPage", async () => {
    mockGenerateObject({ isRelevant: true, summary: "x" });

    const previous = [
      makeChunk({ startPage: 1, summary: "prev-before" }),
      makeChunk({ startPage: 10, summary: "prev-equal" }),
      makeChunk({ startPage: 15, summary: "prev-after" }),
    ];

    await generateChunk(
      buildSummary({ summaryChunks: previous }),
      10,
      12,
      previous,
      ModelProvider.claude_haiku_4_5,
      depoPages,
    );

    const arg = vi.mocked(generateObject).mock.calls[0]![0] as {
      prompt: string;
    };
    expect(arg.prompt).toContain("prev-before");
    expect(arg.prompt).not.toContain("prev-equal");
    expect(arg.prompt).not.toContain("prev-after");
  });

  it("treats isRelevant=false as an empty summary", async () => {
    mockGenerateObject({ isRelevant: false, summary: "model wrote stuff" });

    await generateChunk(
      buildSummary(),
      1,
      3,
      [],
      ModelProvider.claude_haiku_4_5,
      depoPages,
    );

    expect(dbMock.summaryChunk.upsert).toHaveBeenCalledOnce();
    const upsertArg = dbMock.summaryChunk.upsert.mock.calls[0]![0] as {
      create: { summary: string; isRelevant: boolean };
    };
    expect(upsertArg.create.summary).toBe("");
    expect(upsertArg.create.isRelevant).toBe(false);
  });

  it("persists token usage and computes estimated cost", async () => {
    mockGenerateObject({
      isRelevant: true,
      summary: "ok",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });

    await generateChunk(
      buildSummary(),
      1,
      3,
      [],
      ModelProvider.claude_haiku_4_5,
      depoPages,
    );

    const upsertArg = dbMock.summaryChunk.upsert.mock.calls[0]![0] as {
      create: {
        inputTokenCount: number;
        outputTokenCount: number;
        estimatedCost: number;
      };
    };
    expect(upsertArg.create.inputTokenCount).toBe(1_000_000);
    expect(upsertArg.create.outputTokenCount).toBe(1_000_000);
    // claude_haiku_4_5: $1/M input + $5/M output → $6 for 1M each.
    expect(upsertArg.create.estimatedCost).toBeCloseTo(6, 6);
  });

  it("upserts by (documentId, startPage, endPage)", async () => {
    mockGenerateObject({ isRelevant: true, summary: "x" });

    await generateChunk(
      buildSummary({ id: "doc_z" }),
      5,
      7,
      [],
      ModelProvider.claude_haiku_4_5,
      depoPages,
    );

    const upsertArg = dbMock.summaryChunk.upsert.mock.calls[0]![0] as {
      where: { documentId_startPage_endPage: Record<string, unknown> };
    };
    expect(upsertArg.where.documentId_startPage_endPage).toEqual({
      documentId: "doc_z",
      startPage: 5,
      endPage: 7,
    });
  });
});
