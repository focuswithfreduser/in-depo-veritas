import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "ai";

import { ModelProvider } from "@/app/generated/prisma/client";
import generateAbstract from "@/features/summarize/generate-abstract";
import { dbMock } from "@/test/mocks/db";
import { makeChunk } from "@/test/factories";

vi.mock("@/features/summarize/models", () => ({
  getModelForProvider: vi.fn(() => ({ id: "fake-model" })),
}));

function mockGenerateText(args: {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  vi.mocked(generateText).mockResolvedValue({
    text: args.text,
    usage: {
      inputTokens: args.inputTokens ?? 200,
      outputTokens: args.outputTokens ?? 80,
    },
  } as never);
}

beforeEach(() => {
  dbMock.summaryAbstract.upsert.mockResolvedValue({} as never);
});

describe("generateAbstract", () => {
  it("throws when no chunks are provided", async () => {
    await expect(
      generateAbstract("doc_a", ModelProvider.claude_haiku_4_5, []),
    ).rejects.toThrow(/No summary chunks/);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("caps the number of chunks fed into the prompt at 100", async () => {
    mockGenerateText({ text: "abstract" });
    const chunks = Array.from({ length: 150 }, (_, i) =>
      makeChunk({ summary: `chunk-${i}` }),
    );

    await generateAbstract("doc_a", ModelProvider.claude_haiku_4_5, chunks);

    const arg = vi.mocked(generateText).mock.calls[0]![0] as {
      prompt: string;
    };
    expect(arg.prompt).toContain("chunk-0");
    expect(arg.prompt).toContain("chunk-99");
    expect(arg.prompt).not.toContain("chunk-100");
    expect(arg.prompt).not.toContain("chunk-149");
  });

  it("does NOT mutate the input chunks array", async () => {
    mockGenerateText({ text: "abstract" });
    const chunks = Array.from({ length: 5 }, (_, i) =>
      makeChunk({ summary: `c-${i}` }),
    );
    const originalLength = chunks.length;
    const originalFirst = chunks[0];

    await generateAbstract("doc_a", ModelProvider.claude_haiku_4_5, chunks);

    expect(chunks.length).toBe(originalLength);
    expect(chunks[0]).toBe(originalFirst);
  });

  it("upserts the abstract row, connecting it to the document and stamping timing/cost", async () => {
    mockGenerateText({
      text: "Final abstract",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });

    await generateAbstract("doc_42", ModelProvider.claude_haiku_4_5, [
      makeChunk({ summary: "c1" }),
    ]);

    expect(dbMock.summaryAbstract.upsert).toHaveBeenCalledOnce();
    const upsertArg = dbMock.summaryAbstract.upsert.mock.calls[0]![0] as {
      where: { id: string };
      update: { abstract: string };
      create: {
        abstract: string;
        modelProvider: ModelProvider;
        id: string;
        document: { connect: { id: string } };
        timeInMs: number;
        inputTokenCount: number;
        outputTokenCount: number;
        estimatedCost: number;
      };
    };

    expect(upsertArg.where.id).toBe("doc_42");
    expect(upsertArg.update.abstract).toBe("Final abstract");
    expect(upsertArg.create.abstract).toBe("Final abstract");
    expect(upsertArg.create.modelProvider).toBe(ModelProvider.claude_haiku_4_5);
    expect(upsertArg.create.document).toEqual({ connect: { id: "doc_42" } });
    expect(upsertArg.create.inputTokenCount).toBe(1_000_000);
    expect(upsertArg.create.outputTokenCount).toBe(1_000_000);
    expect(upsertArg.create.estimatedCost).toBeCloseTo(6, 6);
    // timeInMs is an elapsed-time number, not a token count.
    expect(upsertArg.create.timeInMs).toBeGreaterThanOrEqual(0);
    expect(upsertArg.create.timeInMs).toBeLessThan(60_000);
  });

  it("treats missing usage fields as zero tokens", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "abs",
      usage: {},
    } as never);

    await generateAbstract("doc_a", ModelProvider.claude_haiku_4_5, [
      makeChunk(),
    ]);

    const upsertArg = dbMock.summaryAbstract.upsert.mock.calls[0]![0] as {
      create: { inputTokenCount: number; outputTokenCount: number };
    };
    expect(upsertArg.create.inputTokenCount).toBe(0);
    expect(upsertArg.create.outputTokenCount).toBe(0);
  });
});
