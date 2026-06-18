import { describe, expect, it } from "vitest";

import {
  AccessDeniedError,
  ACCESS_DENIED_MESSAGES,
  accessDeniedRedirectTarget,
  accessDeniedReasonFromCause,
  getAccessDeniedReason,
  isAccessDeniedReason,
} from "./access-control";

describe("isAccessDeniedReason", () => {
  it("accepts the known reasons", () => {
    expect(isAccessDeniedReason("suspended")).toBe(true);
    expect(isAccessDeniedReason("access-expired")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isAccessDeniedReason("nope")).toBe(false);
    expect(isAccessDeniedReason("")).toBe(false);
    expect(isAccessDeniedReason(null)).toBe(false);
    expect(isAccessDeniedReason(undefined)).toBe(false);
    expect(isAccessDeniedReason(403)).toBe(false);
  });
});

describe("ACCESS_DENIED_MESSAGES", () => {
  it("has clear, distinct copy for each reason", () => {
    expect(ACCESS_DENIED_MESSAGES.suspended).toMatch(/suspended/i);
    expect(ACCESS_DENIED_MESSAGES["access-expired"]).toMatch(/expired/i);
  });
});

describe("AccessDeniedError / accessDeniedReasonFromCause", () => {
  it("carries the reason and is readable back from a cause", () => {
    const err = new AccessDeniedError("access-expired");
    expect(err).toBeInstanceOf(Error);
    expect(err.reason).toBe("access-expired");
    expect(accessDeniedReasonFromCause(err)).toBe("access-expired");
  });

  it("returns null for an unrelated cause", () => {
    expect(accessDeniedReasonFromCause(new Error("boom"))).toBeNull();
    expect(accessDeniedReasonFromCause(null)).toBeNull();
    expect(accessDeniedReasonFromCause({ reason: "suspended" })).toBeNull();
  });
});

describe("getAccessDeniedReason", () => {
  it("reads the discriminator off a tRPC client error shape", () => {
    expect(
      getAccessDeniedReason({ data: { accessDeniedReason: "suspended" } }),
    ).toBe("suspended");
    expect(
      getAccessDeniedReason({ data: { accessDeniedReason: "access-expired" } }),
    ).toBe("access-expired");
  });

  it("returns null when no (or an unknown) discriminator is present", () => {
    expect(
      getAccessDeniedReason({ data: { accessDeniedReason: null } }),
    ).toBeNull();
    expect(getAccessDeniedReason({ data: {} })).toBeNull();
    expect(
      getAccessDeniedReason({ data: { accessDeniedReason: "weird" } }),
    ).toBeNull();
    expect(getAccessDeniedReason({})).toBeNull();
    expect(getAccessDeniedReason(null)).toBeNull();
    expect(getAccessDeniedReason("UNAUTHORIZED")).toBeNull();
  });
});

describe("accessDeniedRedirectTarget", () => {
  it("targets the login screen carrying the reason", () => {
    expect(
      accessDeniedRedirectTarget(
        { data: { accessDeniedReason: "access-expired" } },
        "/app/documents",
      ),
    ).toBe("/login?reason=access-expired");

    expect(
      accessDeniedRedirectTarget(
        { data: { accessDeniedReason: "suspended" } },
        "/app",
      ),
    ).toBe("/login?reason=suspended");
  });

  it("does not redirect for an ordinary error (e.g. a normal logout)", () => {
    // A plain UNAUTHORIZED from a normal logout carries no discriminator and
    // must not be mislabeled as expired access.
    expect(
      accessDeniedRedirectTarget({ data: { code: "UNAUTHORIZED" } }, "/app"),
    ).toBeNull();
    expect(accessDeniedRedirectTarget(new Error("network"), "/app")).toBeNull();
  });

  it("does not redirect when already on the login screen (avoids a loop)", () => {
    expect(
      accessDeniedRedirectTarget(
        { data: { accessDeniedReason: "access-expired" } },
        "/login",
      ),
    ).toBeNull();
    expect(
      accessDeniedRedirectTarget(
        { data: { accessDeniedReason: "suspended" } },
        "/login?reason=suspended",
      ),
    ).toBeNull();
  });
});
