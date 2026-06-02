import { describe, expect, it } from "vitest";

import { buildAnonymousCaller, buildCaller } from "@/test/trpc-caller";
import { dbMock } from "@/test/mocks/db";
import { makeSession } from "@/test/factories";

// Phase 3 / review S9 regression: the previous `me.update` accepted a
// `joinExistingOrganizationId` field that let any caller silently join any
// organisation matching their email domain. The field has been removed and
// joining is now invitation-only. These tests lock the surface area down.
describe("me.update", () => {
  it("rejects unauthenticated callers", async () => {
    const caller = buildAnonymousCaller();
    await expect(
      caller.me.update({ workspaceName: "Whatever" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("ignores the legacy joinExistingOrganizationId input — never creates a self-join membership (S9)", async () => {
    const session = makeSession({ activeOrganizationId: null });
    const caller = buildCaller({ session });

    dbMock.user.findUnique.mockResolvedValue({
      banned: false,
      banExpires: null,
      accessExpiresAt: null,
    } as never);
    dbMock.organization.create.mockResolvedValueOnce({
      id: "org_new",
      name: "New Org",
    } as never);
    dbMock.member.create.mockResolvedValueOnce({} as never);
    dbMock.session.update.mockResolvedValueOnce({} as never);

    await caller.me.update({
      workspaceName: "New Org",
      // Legacy field — schema removed in Phase 3. Zod's default behaviour is
      // to strip unknown keys, so the caller silently drops it before the
      // resolver runs. We pass it anyway to assert the server never honours
      // it (no membership in `org_other_company` is ever created).
      joinExistingOrganizationId: "org_other_company",
    } as never);

    // The legacy "join existing org by domain" path is gone. The mutation
    // should always fall through to creating a brand-new organisation; it
    // must never reach into an existing one based on the input alone.
    expect(dbMock.organization.create).toHaveBeenCalledTimes(1);
    expect(dbMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_new",
          role: "owner",
        }),
      }),
    );
    expect(dbMock.member.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_other_company",
        }),
      }),
    );
  });

  it("renames an existing organisation when the user already has one active", async () => {
    const session = makeSession({ activeOrganizationId: "org_existing" });
    const caller = buildCaller({ session });

    dbMock.user.findUnique.mockResolvedValue({
      banned: false,
      banExpires: null,
      accessExpiresAt: null,
    } as never);
    dbMock.organization.update.mockResolvedValueOnce({
      id: "org_existing",
      name: "Renamed",
    } as never);

    const out = await caller.me.update({ workspaceName: "Renamed" });

    expect(dbMock.organization.update).toHaveBeenCalledWith({
      where: { id: "org_existing" },
      data: { name: "Renamed" },
    });
    expect(out).toMatchObject({
      success: true,
      organizationId: "org_existing",
    });
    // The legacy "join" code path is gone; no member rows should ever be
    // created from me.update.
    expect(dbMock.member.create).not.toHaveBeenCalled();
  });
});
