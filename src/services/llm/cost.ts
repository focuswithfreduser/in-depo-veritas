import { ModelProvider } from "@/app/generated/prisma/client";

// Cost per million tokens in USD (based on current pricing)
const COST_PER_MILLION_TOKENS = {
  [ModelProvider.gpt_4o_mini]: {
    input: 0.15, // $0.15 per 1M input tokens
    output: 0.6, // $0.60 per 1M output tokens
  },
  [ModelProvider.claude_3_5_haiku]: {
    input: 0.8, // $0.80 per million input tokens (historical)
    output: 4.0, // $4.00 per million output tokens (historical)
  },
  [ModelProvider.claude_4_sonnet]: {
    input: 3.0, // $3.00 per million input tokens (verify current pricing)
    output: 15.0, // $15.00 per million output tokens (verify current pricing)
  },
  [ModelProvider.claude_haiku_4_5]: {
    input: 1.0, // $1.00 per million input tokens
    output: 5.0, // $5.00 per million output tokens
  },
};

export function calculateCost(
  model: ModelProvider,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = COST_PER_MILLION_TOKENS[model];
  if (!rates) {
    console.warn(
      `No cost rates defined for model ${model}, using default rates`,
    );
    return 0;
  }

  const inputCost = (inputTokens / 1000000) * rates.input;
  const outputCost = (outputTokens / 1000000) * rates.output;

  return parseFloat((inputCost + outputCost).toFixed(6));
}
