import { describe, expect, it } from "vitest";

import {
  calculateStatus,
  type DocWithRelations,
} from "@/features/shared/calculate-status";

function buildDoc(overrides: Partial<DocWithRelations> = {}): DocWithRelations {
  return {
    status: "processing",
    expectedChunkCount: 8,
    metadata: null,
    abstract: null,
    _count: { summaryChunks: 0 },
    ...overrides,
  } as DocWithRelations;
}

describe("calculateStatus", () => {
  it("returns null progress when status is not 'processing'", () => {
    const result = calculateStatus(buildDoc({ status: "complete" }));
    expect(result).toEqual({ status: "complete", progress: null });
  });

  it("returns null progress when expectedChunkCount is null", () => {
    const result = calculateStatus(buildDoc({ expectedChunkCount: null }));
    expect(result).toEqual({ status: "processing", progress: null });
  });

  it("computes progress as (chunks + metadata + abstract) / (expected + 2)", () => {
    // 4 chunks done out of 8, no metadata, no abstract → 4 / 10 = 40%.
    const result = calculateStatus(
      buildDoc({
        _count: { summaryChunks: 4 },
        metadata: null,
        abstract: null,
      }),
    );
    expect(result).toEqual({ status: "processing", progress: 40 });
  });

  it("counts metadata and abstract as one LLM call each", () => {
    const result = calculateStatus(
      buildDoc({
        _count: { summaryChunks: 0 },
        metadata: { id: "meta_1" } as DocWithRelations["metadata"],
        abstract: { id: "abs_1" } as DocWithRelations["abstract"],
      }),
    );
    // 2 / 10 = 20%
    expect(result).toEqual({ status: "processing", progress: 20 });
  });

  it("reports 100% when everything is done", () => {
    const result = calculateStatus(
      buildDoc({
        expectedChunkCount: 3,
        _count: { summaryChunks: 3 },
        metadata: { id: "m" } as DocWithRelations["metadata"],
        abstract: { id: "a" } as DocWithRelations["abstract"],
      }),
    );
    // (3 + 1 + 1) / (3 + 2) = 5/5 = 100%
    expect(result).toEqual({ status: "processing", progress: 100 });
  });
});
