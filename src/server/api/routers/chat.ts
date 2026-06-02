import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedOrganizationProcedure } from "../trpc";
import { mockChatModel } from "@/features/chat/mock-provider";
import { fetchPages } from "@/features/summarize/extract/extract";
import { db } from "@/lib/db";
import { env } from "@/create-env.mjs";
import { ChatMessageSchema } from "@/features/chat/types";

const model =
  env.USE_TEST_PROVIDERS === "false"
    ? anthropic("claude-haiku-4-5")
    : mockChatModel;

export const chatRouter = createTRPCRouter({
  sendMessage_streaming: protectedOrganizationProcedure
    .input(
      z.object({
        messages: z.array(ChatMessageSchema),
        metadata: z.object({ documentId: z.string().min(1) }),
      }),
    )
    .mutation(async function* ({ ctx, input }) {
      let systemMessage =
        "You are a helpful AI assistant that helps users understand and analyze documents. Be concise and accurate in your responses.";

      const documentId = input.metadata.documentId;
      const activeOrganizationId = ctx.session.session.activeOrganizationId!;

      try {
        const document = await db.document.findFirst({
          where: {
            id: documentId,
            organizationId: activeOrganizationId,
            deletedAt: null, // Exclude deleted documents
          },
          include: {
            summaryChunks: true,
            metadata: true,
            abstract: true,
          },
        });

        if (!document) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { pages } = await fetchPages(document);

        // Filter pages based on isRelevant flag from summaryChunks
        // Create a Set of relevant page numbers for O(1) lookup
        const relevantPageNumbers = new Set<number>();
        document.summaryChunks.forEach((chunk) => {
          if (chunk.isRelevant) {
            // Add all pages in the chunk's range
            for (
              let pageNum = chunk.startPage;
              pageNum <= chunk.endPage;
              pageNum++
            ) {
              relevantPageNumbers.add(pageNum);
            }
          }
        });

        // Filter pages array based on relevant page numbers
        // pages array is 0-indexed, but page numbers are 1-indexed
        const relevantPages = pages.filter((_, index) =>
          relevantPageNumbers.has(index + 1),
        );

        const documentText = relevantPages.join("\n\n");
        systemMessage = `You are a helpful AI assistant analyzing the document titled "${document.fileName}".

Document Content:
${documentText}

Please answer questions about this document based on its content. Be concise and accurate in your responses.`;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Error fetching document:", error);
        // Fall back to basic system message if document fetch fails
      }

      const result = streamText({
        model,
        messages: input.messages,
        system: systemMessage,
      });

      for await (const chunk of result.textStream) {
        yield chunk;
      }
    }),
});
