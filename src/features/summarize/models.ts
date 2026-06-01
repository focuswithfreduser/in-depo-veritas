import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { FAKE_METADATA } from "./types";
import { env } from "@/create-env.mjs";
import { ModelProvider } from "@/app/generated/prisma/client";

const anthropicHaikuModel = anthropic("claude-haiku-4-5");
const anthropicSonnetModel = anthropic("claude-4-sonnet-20250514");

// Safety guard: Only initialize OpenAI model if API key is present
// This prevents initialization errors when the key is missing
const openaiModelBase = env.OPENAI_API_KEY
  ? openai("gpt-4o-mini-2024-07-18")
  : null;

// Create a wrapper that throws a helpful error when accessed if key is missing
const openaiModel: LanguageModel =
  openaiModelBase ??
  (new Proxy(
    {},
    {
      get() {
        throw new Error(
          "OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable or use Anthropic provider instead.",
        );
      },
    },
  ) as LanguageModel);

export const useFake = env.USE_TEST_PROVIDERS === "true";

// Create a simple mock model that implements the language model interface
const fakeModel = {
  specificationVersion: "v1" as const,
  provider: "fake",
  modelId: "fake-model",

  doGenerate: async (options: any) => {
    console.log(`${useFake ? "using fake model" : "using real model"}`);

    // Check if this is an object generation request by looking at the mode
    if (
      options.mode?.type === "object-json" ||
      options.mode?.type === "object-tool"
    ) {
      const schema = options.mode?.schema;

      // Check if this looks like our metadata schema
      if (isMetadataSchema(schema)) {
        return {
          rawCall: { rawPrompt: null, rawSettings: {} },
          finishReason: "stop" as const,
          usage: { inputTokens: 10, outputTokens: 20 },
          text: JSON.stringify({
            ...FAKE_METADATA,
            containsDepositionContent: true,
          }),
        };
      }

      // For other object schemas (like chunk summary), return a generic valid object
      return {
        rawCall: { rawPrompt: null, rawSettings: {} },
        finishReason: "stop" as const,
        usage: { inputTokens: 10, outputTokens: 20 },
        text: JSON.stringify({ isRelevant: true, summary: getFakeText() }),
      };
    }

    // Handle regular text generation
    return {
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: "stop" as const,
      usage: { inputTokens: 10, outputTokens: 20 },
      text: getFakeText(),
    };
  },

  defaultObjectGenerationMode: "json" as const,
} as any; // Type assertion to bypass strict typing for our mock

export const anthropicFirst = anthropicHaikuModel;
export const openaiFirst = openaiModel;

export function getModelForProvider(provider: ModelProvider): LanguageModel {
  switch (provider) {
    case ModelProvider.claude_haiku_4_5:
      return anthropicHaikuModel;
    case ModelProvider.claude_4_sonnet:
      return anthropicSonnetModel;
    case ModelProvider.gpt_4o_mini:
      return openaiModel;
    case ModelProvider.claude_3_5_haiku:
      // Use the old haiku 3.5 model for backwards compatibility
      return anthropic("claude-3-5-haiku-20241022");
    default:
      // Default to the new Haiku model
      return anthropicHaikuModel;
  }
}

// Helper function to detect if a schema looks like our metadata schema
function isMetadataSchema(schema: any): boolean {
  if (!schema || typeof schema !== "object") return false;

  // Check for characteristic metadata fields
  const hasMetadataFields =
    schema.properties &&
    ("caseNumber" in schema.properties ||
      "caseTitle" in schema.properties ||
      "deponent" in schema.properties ||
      "depositionDate" in schema.properties);

  return Boolean(hasMetadataFields);
}

// Return three paragraphs of text
function getFakeText() {
  const text = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
  return Array.from({ length: 3 }, () => text).join("\n\n");
}
