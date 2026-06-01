import { MockLanguageModelV2, simulateReadableStream } from "ai/test";

const loremIpsumParagraphs = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.",
];

const loremText = loremIpsumParagraphs.join("\n\n");

export const mockChatModel = new MockLanguageModelV2({
  doGenerate: async () => ({
    finishReason: "stop",
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    content: [{ type: "text", text: loremText }],
    warnings: [],
  }),
  doStream: async () => ({
    stream: simulateReadableStream({
      initialDelayInMs: 100,
      chunkDelayInMs: 50,
      chunks: [
        { type: "text-start", id: "text-1" },
        ...loremText.split(" ").map((word) => ({
          type: "text-delta" as const,
          id: "text-1",
          delta: word + " ",
        })),
        { type: "text-end", id: "text-1" },
        {
          type: "finish" as const,
          finishReason: "stop" as const,
          logprobs: undefined,
          usage: {
            inputTokens: 10,
            outputTokens: loremText.split(" ").length,
            totalTokens: 10 + loremText.split(" ").length,
          },
        },
      ],
    }),
  }),
});
