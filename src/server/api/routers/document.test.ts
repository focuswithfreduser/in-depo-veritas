import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDownloadUrl, getUploadUrl } from "@/lib/supabase-service";
import { triggerDocument } from "@/trigger/document-task";
import { buildCaller, buildAnonymousCaller } from "@/test/trpc-caller";
import { dbMock } from "@/test/mocks/db";
import { makeDocument, makeSession } from "@/test/factories";

// fetchPages reaches into Supabase + PDF parsing; stub it for `get`.
vi.mock("@/features/summarize/extract/extract", () => ({
  fetchPages: vi.fn(async () => ({ pages: ["page 1", "page 2"], chunks: [] })),
}));

// Document deletion helper has its own side effects (Trigger runs,
// Supabase deletes); the router tests only need to verify it was
// invoked correctly.
vi.mock("@/server/utils/delete-document", () => ({
  deleteDocument: vi.fn(),
}));

// ZIP creation likewise — test the router's contract, not the impl.
vi.mock("@/features/summarize/zip-documents", () => ({
  createDocumentsZip: vi.fn(async () => "documents/org/bundle.zip"),
}));

beforeEach(() => {
  vi.mocked(getUploadUrl).mockResolvedValue({
    signedUrl: "https://signed.upload",
    path: "supabase-path",
    token: "supabase-token",
  } as never);
  vi.mocked(getDownloadUrl).mockResolvedValue({
    signedUrl: "https://signed.download",
  } as never);
});

describe("document.list", () => {
  it("scopes the query to the active organization and excludes archived/soft-deleted", async () => {
    dbMock.document.findMany.mockResolvedValue([] as never);
    const session = makeSession({ activeOrganizationId: "org_a" });

    await buildCaller({ session }).document.list();

    expect(dbMock.document.findMany).toHaveBeenCalledOnce();
    const arg = dbMock.document.findMany.mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    expect(arg.where).toMatchObject({
      organizationId: "org_a",
      isArchived: false,
      deletedAt: null,
    });
  });

  it("rejects an unauthenticated caller", async () => {
    await expect(buildAnonymousCaller().document.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("document.getSignedUploadUrl", () => {
  it("builds the path under the active organization", async () => {
    const session = makeSession({ activeOrganizationId: "org_xyz" });

    const out = await buildCaller({ session }).document.getSignedUploadUrl({
      fileName: "deposition.pdf",
      id: "doc_123",
    });

    expect(getUploadUrl).toHaveBeenCalledWith(
      "documents",
      "org_xyz/doc_123-original.pdf",
    );
    expect(out.signedUrl).toBe("https://signed.upload");
    expect(out.filePath).toBe("org_xyz/doc_123-original.pdf");
  });
});

describe("document.createFromSupabaseUrl", () => {
  it("creates the document under the active organization and triggers processing", async () => {
    const session = makeSession({ activeOrganizationId: "org_owner" });
    dbMock.document.create.mockResolvedValue(
      makeDocument({
        id: "doc_new",
        organizationId: "org_owner",
        fileSize: 999,
      }) as never,
    );

    const out = await buildCaller({ session }).document.createFromSupabaseUrl({
      id: "doc_new",
      fileName: "file.pdf",
      fileType: "application/pdf",
      fileSize: 999,
      fileUrl: "documents/org_owner/doc_new-original.pdf",
    });

    expect(dbMock.document.create).toHaveBeenCalledOnce();
    const createArg = dbMock.document.create.mock.calls[0]![0] as {
      data: { organizationId: string };
    };
    expect(createArg.data.organizationId).toBe("org_owner");
    expect(triggerDocument).toHaveBeenCalledWith("doc_new");
    expect(out.id).toBe("doc_new");
  });
});

describe("document.getSignedPDFUrl", () => {
  it("rejects with FORBIDDEN when the URL belongs to another org", async () => {
    dbMock.document.findFirst.mockResolvedValue(null);
    const session = makeSession({ activeOrganizationId: "org_a" });

    await expect(
      buildCaller({ session }).document.getSignedPDFUrl({
        url: "documents/org_OTHER/doc/summary.pdf",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(getDownloadUrl).not.toHaveBeenCalled();
  });

  it("issues the signed URL when the document is owned by the active org", async () => {
    dbMock.document.findFirst.mockResolvedValue({ id: "doc_a" } as never);
    const session = makeSession({ activeOrganizationId: "org_a" });

    const url = await buildCaller({ session }).document.getSignedPDFUrl({
      url: "documents/org_a/doc/summary.pdf",
    });

    expect(url).toBe("https://signed.download");

    // The lookup must filter by the active organization.
    const findArg = dbMock.document.findFirst.mock.calls[0]![0] as {
      where: { organizationId?: string; deletedAt: null };
    };
    expect(findArg.where.organizationId).toBe("org_a");
    expect(findArg.where.deletedAt).toBeNull();
  });

  it("skips the org filter for admin users", async () => {
    dbMock.document.findFirst.mockResolvedValue({ id: "doc_a" } as never);
    const session = makeSession({
      user: { role: "admin" },
      activeOrganizationId: "org_admin_home",
    });

    await buildCaller({ session }).document.getSignedPDFUrl({
      url: "documents/some_other_org/doc/summary.pdf",
    });

    const findArg = dbMock.document.findFirst.mock.calls[0]![0] as {
      where: { organizationId?: string };
    };
    expect(findArg.where.organizationId).toBeUndefined();
  });
});

describe("document.trash", () => {
  it("rejects with FORBIDDEN when the document is not in the active org", async () => {
    dbMock.document.findFirst.mockResolvedValue(null);

    await expect(
      buildCaller().document.trash({
        documentId: "doc_other",
        deleteImmediately: false,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(dbMock.document.update).not.toHaveBeenCalled();
  });

  it("marks the document as archived when deleteImmediately=false", async () => {
    dbMock.document.findFirst.mockResolvedValue({ id: "doc_mine" } as never);
    dbMock.document.update.mockResolvedValue({} as never);

    const out = await buildCaller().document.trash({
      documentId: "doc_mine",
      deleteImmediately: false,
    });

    expect(out).toEqual({ success: true });
    expect(dbMock.document.update).toHaveBeenCalledWith({
      where: { id: "doc_mine" },
      data: { isArchived: true },
    });
  });

  it("delegates to deleteDocument when deleteImmediately=true", async () => {
    const { deleteDocument } = await import("@/server/utils/delete-document");
    dbMock.document.findFirst.mockResolvedValue({ id: "doc_mine" } as never);

    await buildCaller().document.trash({
      documentId: "doc_mine",
      deleteImmediately: true,
    });

    expect(deleteDocument).toHaveBeenCalledWith("doc_mine");
    expect(dbMock.document.update).not.toHaveBeenCalled();
  });
});

describe("document.bulkTrash", () => {
  it("rejects when any requested ID is not owned by the active org", async () => {
    // Asked for 3 IDs, but the DB only returns 2 owned by this org.
    dbMock.document.findMany.mockResolvedValue([
      { id: "doc_1" },
      { id: "doc_2" },
    ] as never);

    await expect(
      buildCaller().document.bulkTrash({
        documentIds: ["doc_1", "doc_2", "doc_3"],
        deleteImmediately: false,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(dbMock.document.updateMany).not.toHaveBeenCalled();
  });

  it("archives all documents at once when ownership checks pass", async () => {
    dbMock.document.findMany.mockResolvedValue([
      { id: "doc_1" },
      { id: "doc_2" },
    ] as never);
    dbMock.document.updateMany.mockResolvedValue({ count: 2 } as never);

    const session = makeSession({ activeOrganizationId: "org_caller" });
    const out = await buildCaller({ session }).document.bulkTrash({
      documentIds: ["doc_1", "doc_2"],
      deleteImmediately: false,
    });

    expect(out).toEqual({ success: true, count: 2 });
    expect(dbMock.document.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["doc_1", "doc_2"] },
        organizationId: "org_caller",
      },
      data: { isArchived: true },
    });
  });

  it("calls deleteDocument once per item when deleteImmediately=true", async () => {
    const { deleteDocument } = await import("@/server/utils/delete-document");
    dbMock.document.findMany.mockResolvedValue([
      { id: "doc_1" },
      { id: "doc_2" },
    ] as never);

    await buildCaller().document.bulkTrash({
      documentIds: ["doc_1", "doc_2"],
      deleteImmediately: true,
    });

    expect(deleteDocument).toHaveBeenCalledTimes(2);
    expect(deleteDocument).toHaveBeenCalledWith("doc_1");
    expect(deleteDocument).toHaveBeenCalledWith("doc_2");
  });
});

describe("document.get", () => {
  it("scopes by activeOrganizationId and deletedAt:null", async () => {
    const doc = makeDocument({ id: "doc_mine", organizationId: "org_a" });
    dbMock.document.findFirstOrThrow.mockResolvedValue({
      ...doc,
      summaryChunks: [],
      metadata: null,
      abstract: null,
    } as never);

    const session = makeSession({ activeOrganizationId: "org_a" });
    const out = await buildCaller({ session }).document.get({ id: "doc_mine" });

    const findArg = dbMock.document.findFirstOrThrow.mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    expect(findArg.where).toMatchObject({
      id: "doc_mine",
      organizationId: "org_a",
      deletedAt: null,
    });
    expect(out.pages).toEqual(["page 1", "page 2"]);
  });
});
