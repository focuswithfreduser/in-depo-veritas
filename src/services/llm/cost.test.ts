import { describe, expect, it, vi } from "vitest";

import { ModelProvider } from "@/app/generated/prisma/client";
import { calculateCost } from "@/services/llm/cost";

describe("calculateCost", () => {
  it.each<[ModelProvider, number, number, number]>([
    // 1M input, 1M output → rates equal the published per-million numbers.
    [ModelProvider.gpt_4o_mini, 1_000_000, 1_000_000, 0.75], // 0.15 + 0.60
    [ModelProvider.claude_3_5_haiku, 1_000_000, 1_000_000, 4.8], // 0.8 + 4.0
    [ModelProvider.claude_4_sonnet, 1_000_000, 1_000_000, 18], // 3.0 + 15.0
    [ModelProvider.claude_haiku_4_5, 1_000_000, 1_000_000, 6], // 1.0 + 5.0
  ])("matches the published price for %s", (model, inT, outT, expected) => {
    expect(calculateCost(model, inT, outT)).toBeCloseTo(expected, 6);
  });

  it("scales linearly with token counts", () => {
    const small = calculateCost(ModelProvider.claude_haiku_4_5, 1_000, 500);
    const large = calculateCost(
      ModelProvider.claude_haiku_4_5,
      10_000,
      5_000,
    );
    expect(large).toBeCloseTo(small * 10, 6);
  });

  it("returns zero for zero usage", () => {
    expect(calculateCost(ModelProvider.claude_haiku_4_5, 0, 0)).toBe(0);
  });

  it("rounds to six decimal places", () => {
    // 1 input token on gpt_4o_mini = 0.15 / 1_000_000 = 1.5e-7, rounds to 0.
    const cost = calculateCost(ModelProvider.gpt_4o_mini, 1, 1);
    // Should never be more than six decimals.
    expect(cost.toString().split(".")[1]?.length ?? 0).toBeLessThanOrEqual(6);
  });

  it("returns 0 and warns when given an unknown provider", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cost = calculateCost(
      "totally_made_up" as ModelProvider,
      1000,
      1000,
    );
    expect(cost).toBe(0);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
