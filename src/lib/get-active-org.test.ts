import { describe, expect, it } from "vitest";

import { getActiveOrganization } from "./get-active-org";
import { dbMock } from "@/test/mocks/db";

describe("getActiveOrganization", () => {
  it("queries with an ascending createdAt orderBy so multi-org users get a stable result", async () => {
    dbMock.organization.findFirst.mockResolvedValueOnce({
      id: "org_1",
    } as never);

    await getActiveOrganization("user_1");

    expect(dbMock.organization.findFirst).toHaveBeenCalledWith({
      where: { members: { some: { userId: "user_1" } } },
      orderBy: { createdAt: "asc" },
    });
  });

  it("returns whatever the DB returns (null when no membership)", async () => {
    dbMock.organization.findFirst.mockResolvedValueOnce(null);
    await expect(getActiveOrganization("user_no_org")).resolves.toBeNull();
  });
});
