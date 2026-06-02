import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { ModelProvider } from "@/app/generated/prisma";
import { db } from "@/lib/db";
import {
  getDownloadUrl,
  uploadFile,
  getUploadUrl,
} from "@/lib/supabase-service";
import { deleteDocument } from "@/server/utils/delete-document";
import { triggerDocument } from "@/trigger/document-task";
import path from "path";
import { createTRPCRouter, protectedOrganizationProcedure } from "../trpc";
import { fetchPages } from "@/features/summarize/extract/extract";
import { createDocumentsZip } from "@/features/summarize/zip-documents";

export const documentRouter = createTRPCRouter({
  getSignedUploadUrl: protectedOrganizationProcedure
    .input(z.object({ fileName: z.string(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { fileName, id } = input;
      const activeOrganizationId = ctx.session.session.activeOrganizationId!;
      const fileExtension = path.extname(fileName);
      const filePath = `${activeOrganizationId}/${id}-original${fileExtension}`;
      const { signedUrl, path: uploadPath } = await getUploadUrl(
        "documents",
        filePath,
      );
      return { signedUrl, filePath: filePath, uploadPath };
    }),

  createFromSupabaseUrl: protectedOrganizationProcedure
    .input(
      z.object({
        id: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        fileUrl: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, fileName, fileType, fileSize, fileUrl } = input;
      const activeOrganizationId = ctx.session.session.activeOrganizationId!;
      const modelProvider = ModelProvider.claude_haiku_4_5;
      const document = await db.document.create({
        data: {
          id,
          fileName,
          fileType,
          modelProvider,
          fileSize,
          fileUrl,
          organizationId: activeOrganizationId,
          userId: ctx.session.session.userId,
        },
      });
      await triggerDocument(document.id);
      return { id: document.id, fileName, fileSize: document.fileSize };
    }),

  list: protectedOrganizationProcedure.query(async ({ ctx }) => {
    const activeOrganizationId = ctx.session.session.activeOrganizationId!;

    const documents = await db.document.findMany({
      where: {
        organizationId: activeOrganizationId,
        isArchived: false,
        deletedAt: null, // Exclude deleted documents
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        createdAt: true,
        status: true,
        pageCount: true,
        summaryUrl: true,
        metadata: true,
        abstract: true,
      },
    });

    return documents;
  }),

  getSignedPDFUrl: protectedOrganizationProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { url } = input;
      const activeOrganizationId = ctx.session.session.activeOrganizationId!;
      const isAdmin = ctx.session.user.role === "admin";

      const document = await db.document.findFirst({
        where: {
          ...(isAdmin ? {} : { organizationId: activeOrganizationId }),
          deletedAt: null,
          OR: [{ fileUrl: url }, { summaryUrl: url }],
        },
        select: { id: true },
      });

      if (!document) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const uploadUrlData = await getDownloadUrl(url);

      return uploadUrlData.signedUrl;
    }),

  trash: protectedOrganizationProcedure
    .input(
      z.object({
        documentId: z.string(),
        deleteImmediately: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { documentId, deleteImmediately } = input;
      const activeOrganizationId = ctx.session.session.activeOrganizationId!;

      const document = await db.document.findFirst({
        where: {
          id: documentId,
          organizationId: activeOrganizationId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!document) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (deleteImmediately) {
        await deleteDocument(documentId);
      } else {
        // Mark as archived
        await db.document.update({
          where: { id: documentId },
          data: { isArchived: true },
        });
      }

      return { success: true };
    }),

  bulkTrash: protectedOrganizationProcedure
    .input(
      z.object({
        documentIds: z.array(z.string()),
        deleteImmediately: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { documentIds, deleteImmediately } = input;
      const activeOrganizationId = ctx.session.session.activeOrganizationId!;

      const documents = await db.document.findMany({
        where: {
          id: { in: documentIds },
          organizationId: activeOrganizationId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (documents.length !== new Set(documentIds).size) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (deleteImmediately) {
        // Delete documents one by one to handle file deletion
        for (const { id: documentId } of documents) {
          await deleteDocument(documentId);
        }
      } else {
        // Mark all as archived in a single query
        await db.document.updateMany({
          where: {
            id: { in: documentIds },
            organizationId: activeOrganizationId,
          },
          data: { isArchived: true },
        });
      }

      return { success: true, count: documentIds.length };
    }),

  createZip: protectedOrganizationProcedure
    .input(z.object({ documentIds: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      const { documentIds } = input;
      const activeOrganizationId = ctx.session.session.activeOrganizationId!;

      const zipUrl = await createDocumentsZip(
        documentIds,
        activeOrganizationId,
      );

      const { signedUrl } = await getDownloadUrl(zipUrl, 3600); // 1 hour expiry

      return { signedUrl };
    }),

  get: protectedOrganizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const activeOrganizationId = ctx.session.session.activeOrganizationId!;

      const document = await db.document.findFirstOrThrow({
        where: { id, organizationId: activeOrganizationId, deletedAt: null },
        include: {
          summaryChunks: true,
          metadata: true,
          abstract: true,
        },
      });
      const { pages } = await fetchPages(document);

      return { ...document, pages };
    }),
});
