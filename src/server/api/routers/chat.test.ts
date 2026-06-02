import { beforeEach, describe, expect, it, vi } from "vitest";
import { streamText } from "ai";

import {
  buildAnonymousCaller,
  buildCaller,
  buildCallerWithoutOrg,
} from "@/test/trpc-caller";
import { dbMock } from "@/test/mocks/db";
import { makeChunk, makeDocument, makeSession } from "@/test/factories";

vi.mock("@/features/summarize/extract/extract", () => ({
  fetchPages: vi.fn(async () => ({
    pages: [
      "page 1 — irrelevant header",
      "page 2 — the testimony begins",
      "page 3 — more testimony",
      "page 4 — index, not testimony",
    ],
    chunks: [],
  })),
}));

function mockStream(...tokens: string[]) {
  vi.mocked(streamText).mockReturnValue({
    textStream: (async function* () {
      for (const t of tokens) yield t;
    })(),
  } as never);
}

// Drives the async-generator mutation end-to-end so error-handling
// works whether the throw happens in middleware (rejects the call) or
// inside the generator body (rejects during iteration).
async function runChat(
  caller: ReturnType<typeof buildCaller>,
  input: { messages: Array<{ role: "user"; content: string }>; metadata: { documentId: string } },
): Promise<string[]> {
  const result = await caller.chat.sendMessage_streaming(input);
  const out: string[] = [];
  for await (const chunk of result as AsyncIterable<string>) {
    out.push(chunk);
  }
  return out;
}

beforeEach(() => {
  mockStream("hi");
});

describe("chat.sendMessage_streaming security", () => {
  const baseInput = {
    messages: [{ role: "user" as const, content: "hi" }],
    metadata: { documentId: "doc_x" },
  };

  it("rejects an unauthenticated caller", async () => {
    await expect(runChat(buildAnonymousCaller(), baseInput)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a caller without an active organization", async () => {
    await expect(runChat(buildCallerWithoutOrg(), baseInput)).rejects.toMatchObject(
      { code: "BAD_REQUEST" },
    );
  });

  it("throws FORBIDDEN when the document is not in the active org", async () => {
    dbMock.document.findFirst.mockResolvedValue(null);

    await expect(
      runChat(buildCaller(), {
        ...baseInput,
        metadata: { documentId: "doc_other_org" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(streamText).not.toHaveBeenCalled();
  });

  it("filters the document lookup by organizationId AND deletedAt:null", async () => {
    dbMock.document.findFirst.mockResolvedValue({
      ...makeDocument({ id: "doc_a", fileName: "deposition.pdf" }),
      summaryChunks: [],
      metadata: null,
      abstract: null,
    } as never);

    const session = makeSession({ activeOrganizationId: "org_a" });
    await runChat(buildCaller({ session }), {
      ...baseInput,
      metadata: { documentId: "doc_a" },
    });

    const arg = dbMock.document.findFirst.mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    expect(arg.where).toMatchObject({
      id: "doc_a",
      organizationId: "org_a",
      deletedAt: null,
    });
  });
});

describe("chat.sendMessage_streaming behavior", () => {
  it("includes only pages flagged as relevant in the system message", async () => {
    dbMock.document.findFirst.mockResolvedValue({
      ...makeDocument({ id: "doc_a", fileName: "Smith v. Jones" }),
      // Only pages 2 and 3 are relevant.
      summaryChunks: [
        makeChunk({ startPage: 2, endPage: 3, isRelevant: true }),
        makeChunk({ startPage: 4, endPage: 4, isRelevant: false }),
      ],
      metadata: null,
      abstract: null,
    } as never);

    await runChat(buildCaller(), {
      messages: [{ role: "user", content: "summarize" }],
      metadata: { documentId: "doc_a" },
    });

    expect(streamText).toHaveBeenCalledOnce();
    const arg = vi.mocked(streamText).mock.calls[0]![0] as {
      system: string;
    };
    expect(arg.system).toContain("Smith v. Jones");
    expect(arg.system).toContain("page 2 — the testimony begins");
    expect(arg.system).toContain("page 3 — more testimony");
    expect(arg.system).not.toContain("page 1 — irrelevant header");
    expect(arg.system).not.toContain("page 4 — index, not testimony");
  });

  it("yields each token chunk from the underlying stream", async () => {
    dbMock.document.findFirst.mockResolvedValue({
      ...makeDocument({ id: "doc_a" }),
      summaryChunks: [],
      metadata: null,
      abstract: null,
    } as never);
    mockStream("hello ", "there ", "world");

    const chunks = await runChat(buildCaller(), {
      messages: [{ role: "user", content: "hi" }],
      metadata: { documentId: "doc_a" },
    });

    expect(chunks).toEqual(["hello ", "there ", "world"]);
  });
});
