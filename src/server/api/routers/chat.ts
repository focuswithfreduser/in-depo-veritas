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

        // Prefer the pages covered by relevant summary chunks, but fall back to
        // the full document when no chunks have been generated yet (e.g. the
        // summary is still processing) or none are marked relevant. Without this
        // fallback the model received an empty context and replied that the
        // document was empty even though its text was available. (BUG-001)
        // pages array is 0-indexed, but page numbers are 1-indexed.
        const relevantPages =
          relevantPageNumbers.size > 0
            ? pages.filter((_, index) => relevantPageNumbers.has(index + 1))
            : pages;

        const documentText = relevantPages.join("\n\n").trim();

        if (documentText.length > 0) {
          systemMessage = `You are a helpful AI assistant analyzing the document titled "${document.fileName}".

Document Content:
${documentText}

Please answer questions about this document based on its content. Be concise and accurate in your responses.`;
        } else {
          // No text is available yet — most likely the document is still being
          // prepared. Be honest about that instead of claiming it is empty.
          systemMessage = `You are a helpful AI assistant for the document titled "${document.fileName}". Its text is not available yet — it may still be uploading or processing. Let the user know the document is still being prepared and ask them to try again in a few moments. Do not claim the document is empty.`;
        }
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
