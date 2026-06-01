import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.union([
    z.literal("user"),
    z.literal("assistant"),
    z.literal("system"),
  ]),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
