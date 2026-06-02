import { describe, expect, it, vi } from "vitest";

import {
  buildAdminCaller,
  buildAnonymousCaller,
  buildCaller,
} from "@/test/trpc-caller";
import { dbMock } from "@/test/mocks/db";
import { makeSession } from "@/test/factories";

// Several admin endpoints transitively import these — stub them so the
// router module loads cleanly under test.
vi.mock("@/features/summarize/extract/extract", () => ({
  fetchPages: vi.fn(async () => ({ pages: [], chunks: [] })),
}));
vi.mock("@/features/summarize/summarize-document", () => ({
  summarizeDocument: vi.fn(),
}));
vi.mock("@/features/create-summaries/screenshot/take-screenshot", () => ({
  takeScreenshotAndSave: vi.fn(),
}));
vi.mock("@/server/utils/clone-documents", () => ({
  cloneDocumentsToWorkspace: vi.fn(),
}));
vi.mock("@/server/utils/delete-user", () => ({
  deleteUser: vi.fn(),
}));
vi.mock("@/features/summarize/reset-document", () => ({
  resetDocument: vi.fn(),
}));
vi.mock("@/emails/user/admin-invite", () => ({
  getAdminInviteParams: vi.fn(async () => ({
    to: "x@example.com",
    from: "noreply@example.com",
    subject: "x",
    html: "x",
    text: "x",
  })),
}));

describe("admin router authorization", () => {
  it("rejects unauthenticated callers", async () => {
    const caller = buildAnonymousCaller();
    await expect(caller.admin.listFiles()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects authenticated non-admin users", async () => {
    const caller = buildCaller({
      session: makeSession({ user: { role: null } }),
    });
    await expect(caller.admin.listFiles()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects users with a non-admin role string", async () => {
    const caller = buildCaller({
      session: makeSession({ user: { role: "user" } }),
    });
    await expect(caller.admin.listFiles()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("allows admins through", async () => {
    dbMock.document.findMany.mockResolvedValue([] as never);
    const caller = buildAdminCaller();
    await expect(caller.admin.listFiles()).resolves.toEqual([]);
  });
});

describe("admin.listUsers", () => {
  it("returns whatever the DB returns when called by an admin", async () => {
    dbMock.user.findMany.mockResolvedValue([
      { id: "u1" },
      { id: "u2" },
    ] as never);

    const caller = buildAdminCaller();
    const out = await caller.admin.listUsers();
    expect(out).toEqual([{ id: "u1" }, { id: "u2" }]);
  });
});

describe("admin router shape — dead code removed (Phase 3)", () => {
  it("cancelJob is no longer exposed (B4)", async () => {
    const { adminRouter } = await import("./admin");
    // Procedure registry lives on `_def.procedures` in tRPC v11.
    const procedures = (adminRouter as unknown as {
      _def: { procedures: Record<string, unknown> };
    })._def.procedures;
    expect(procedures.cancelJob).toBeUndefined();
  });
});

describe("admin.resetDocument", () => {
  it("delegates to the resetDocument helper for the given id", async () => {
    const { resetDocument } = await import(
      "@/features/summarize/reset-document"
    );

    const caller = buildAdminCaller();
    const out = await caller.admin.resetDocument({ id: "doc_x" });

    expect(resetDocument).toHaveBeenCalledWith("doc_x");
    expect(out).toEqual({
      success: true,
      message: "Document reset complete",
    });
  });
});

// Pre-arm the in-middleware findUnique used by protectedProcedure so the
// per-request access check treats the admin caller as not restricted.
function armAdminUnrestricted() {
  dbMock.user.findUnique.mockResolvedValue({
    banned: false,
    banExpires: null,
    accessExpiresAt: null,
  } as never);
}

describe("admin.setUserSuspension", () => {
  it("rejects non-admin callers", async () => {
    const caller = buildCaller({
      session: makeSession({ user: { role: null } }),
    });
    await expect(
      caller.admin.setUserSuspension({
        userId: "u_other",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses to suspend yourself", async () => {
    armAdminUnrestricted();
    const session = makeSession({ user: { role: "admin" } });
    const caller = buildCaller({ session });

    await expect(
      caller.admin.setUserSuspension({
        userId: session.user.id,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects expiresAt in the past", async () => {
    armAdminUnrestricted();
    dbMock.user.findUniqueOrThrow.mockResolvedValueOnce({
      id: "u_target",
    } as never);

    const caller = buildAdminCaller();
    await expect(
      caller.admin.setUserSuspension({
        userId: "u_target",
        expiresAt: new Date(Date.now() - 60_000),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("suspends with a future expiry and revokes sessions", async () => {
    armAdminUnrestricted();
    dbMock.user.findUniqueOrThrow.mockResolvedValueOnce({
      id: "u_target",
    } as never);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    dbMock.user.update.mockResolvedValueOnce({
      id: "u_target",
      banned: true,
      banExpires: expiresAt,
      banReason: "Policy review",
    } as never);
    dbMock.session.deleteMany.mockResolvedValueOnce({ count: 2 } as never);

    const caller = buildAdminCaller();
    const out = await caller.admin.setUserSuspension({
      userId: "u_target",
      expiresAt,
      reason: "Policy review",
    });

    expect(dbMock.user.update).toHaveBeenCalledWith({
      where: { id: "u_target" },
      data: {
        banned: true,
        banExpires: expiresAt,
        banReason: "Policy review",
      },
      select: {
        id: true,
        banned: true,
        banExpires: true,
        banReason: true,
      },
    });
    expect(dbMock.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u_target" },
    });
    expect(out).toMatchObject({
      success: true,
      banned: true,
      banExpires: expiresAt,
    });
  });

  it("permanent: true creates a ban with no expiry", async () => {
    armAdminUnrestricted();
    dbMock.user.findUniqueOrThrow.mockResolvedValueOnce({
      id: "u_target",
    } as never);
    dbMock.user.update.mockResolvedValueOnce({
      id: "u_target",
      banned: true,
      banExpires: null,
      banReason: "Suspended by administrator",
    } as never);
    dbMock.session.deleteMany.mockResolvedValueOnce({ count: 0 } as never);

    const caller = buildAdminCaller();
    await caller.admin.setUserSuspension({
      userId: "u_target",
      permanent: true,
    });

    expect(dbMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          banned: true,
          banExpires: null,
        }),
      }),
    );
  });

  it("falls back to a default reason when none is supplied", async () => {
    armAdminUnrestricted();
    dbMock.user.findUniqueOrThrow.mockResolvedValueOnce({
      id: "u_target",
    } as never);
    dbMock.user.update.mockResolvedValueOnce({
      id: "u_target",
      banned: true,
      banExpires: new Date(),
      banReason: "Suspended by administrator",
    } as never);
    dbMock.session.deleteMany.mockResolvedValueOnce({ count: 0 } as never);

    const caller = buildAdminCaller();
    await caller.admin.setUserSuspension({
      userId: "u_target",
      expiresAt: new Date(Date.now() + 60_000),
    });

    expect(dbMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          banReason: "Suspended by administrator",
        }),
      }),
    );
  });

  it("unsuspends when expiresAt is null and permanent is not set", async () => {
    armAdminUnrestricted();
    dbMock.user.findUniqueOrThrow.mockResolvedValueOnce({
      id: "u_target",
    } as never);
    dbMock.user.update.mockResolvedValueOnce({
      id: "u_target",
      banned: false,
      banExpires: null,
    } as never);

    const caller = buildAdminCaller();
    const out = await caller.admin.setUserSuspension({
      userId: "u_target",
      expiresAt: null,
    });

    expect(dbMock.user.update).toHaveBeenCalledWith({
      where: { id: "u_target" },
      data: { banned: false, banExpires: null, banReason: null },
      select: { id: true, banned: true, banExpires: true },
    });
    expect(dbMock.session.deleteMany).not.toHaveBeenCalled();
    expect(out).toMatchObject({
      success: true,
      banned: false,
      banExpires: null,
    });
  });
});

describe("admin.setUserAccessExpiry", () => {
  it("rejects non-admin callers", async () => {
    const caller = buildCaller({
      session: makeSession({ user: { role: null } }),
    });
    await expect(
      caller.admin.setUserAccessExpiry({
        userId: "u_other",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses to target the calling admin", async () => {
    armAdminUnrestricted();
    const session = makeSession({ user: { role: "admin" } });
    const caller = buildCaller({ session });

    await expect(
      caller.admin.setUserAccessExpiry({
        userId: session.user.id,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects expiresAt in the past", async () => {
    armAdminUnrestricted();
    dbMock.user.findUniqueOrThrow.mockResolvedValueOnce({
      id: "u_target",
    } as never);

    const caller = buildAdminCaller();
    await expect(
      caller.admin.setUserAccessExpiry({
        userId: "u_target",
        expiresAt: new Date(Date.now() - 60_000),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("sets accessExpiresAt to a future date", async () => {
    armAdminUnrestricted();
    dbMock.user.findUniqueOrThrow.mockResolvedValueOnce({
      id: "u_target",
    } as never);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    dbMock.user.update.mockResolvedValueOnce({
      id: "u_target",
      accessExpiresAt: expiresAt,
    } as never);

    const caller = buildAdminCaller();
    const out = await caller.admin.setUserAccessExpiry({
      userId: "u_target",
      expiresAt,
    });

    expect(dbMock.user.update).toHaveBeenCalledWith({
      where: { id: "u_target" },
      data: { accessExpiresAt: expiresAt },
      select: { id: true, accessExpiresAt: true },
    });
    expect(dbMock.session.deleteMany).not.toHaveBeenCalled();
    expect(out).toMatchObject({
      success: true,
      accessExpiresAt: expiresAt,
    });
  });

  it("clears accessExpiresAt when expiresAt is null", async () => {
    armAdminUnrestricted();
    dbMock.user.findUniqueOrThrow.mockResolvedValueOnce({
      id: "u_target",
    } as never);
    dbMock.user.update.mockResolvedValueOnce({
      id: "u_target",
      accessExpiresAt: null,
    } as never);

    const caller = buildAdminCaller();
    const out = await caller.admin.setUserAccessExpiry({
      userId: "u_target",
      expiresAt: null,
    });

    expect(dbMock.user.update).toHaveBeenCalledWith({
      where: { id: "u_target" },
      data: { accessExpiresAt: null },
      select: { id: true, accessExpiresAt: true },
    });
    expect(out).toMatchObject({
      success: true,
      accessExpiresAt: null,
    });
  });
});
