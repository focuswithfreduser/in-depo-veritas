import { describe, expect, it } from "vitest";

import { dbMock } from "@/test/mocks/db";
import { GET } from "./route";

const CRON_SECRET = "test-cron-secret";
process.env.CRON_SECRET = CRON_SECRET;

function buildRequest(authHeader?: string) {
  return new Request("http://localhost/api/cron/cleanup-expired-bans", {
    method: "GET",
    headers: authHeader ? { authorization: authHeader } : {},
  }) as unknown as Parameters<typeof GET>[0];
}

describe("GET /api/cron/cleanup-expired-bans", () => {
  it("rejects requests without an Authorization header", async () => {
    const res = await GET(buildRequest());
    expect(res.status).toBe(401);
    expect(dbMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("rejects requests with a wrong bearer token", async () => {
    const res = await GET(buildRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
    expect(dbMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("clears expired bans when called with the correct secret", async () => {
    dbMock.user.updateMany.mockResolvedValueOnce({ count: 3 } as never);

    const res = await GET(buildRequest(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({ cleared: 3 });
    expect(dbMock.user.updateMany).toHaveBeenCalledTimes(1);

    const call = dbMock.user.updateMany.mock.calls[0][0];
    expect(call.where).toMatchObject({
      banned: true,
      banExpires: { lt: expect.any(Date) },
    });
    expect(call.data).toEqual({
      banned: false,
      banExpires: null,
      banReason: null,
    });
  });

  it("reports zero cleared when nothing matched", async () => {
    dbMock.user.updateMany.mockResolvedValueOnce({ count: 0 } as never);

    const res = await GET(buildRequest(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cleared).toBe(0);
  });

  it("returns 500 when the DB throws", async () => {
    dbMock.user.updateMany.mockRejectedValueOnce(new Error("boom") as never);

    const res = await GET(buildRequest(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });
});
