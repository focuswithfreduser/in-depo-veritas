import { describe, expect, it } from "vitest";

import { classifyOtpSignInError } from "./login-error";

describe("classifyOtpSignInError", () => {
  it("maps Better Auth's BANNED_USER error to a suspension", () => {
    expect(
      classifyOtpSignInError({
        code: "BANNED_USER",
        status: 403,
        message: "You have been banned from this application.",
      }),
    ).toBe("suspended");
  });

  it("maps our ACCESS_EXPIRED gate error to an expiry", () => {
    expect(
      classifyOtpSignInError({
        code: "ACCESS_EXPIRED",
        status: 403,
        message: "Your access has expired.",
      }),
    ).toBe("access-expired");
  });

  it("returns null for an unrecognized 403 (cannot tell suspension from expiry)", () => {
    // Both hard blocks set an explicit code; we branch on it rather than
    // guessing from a bare status, so an unknown 403 stays generic.
    expect(classifyOtpSignInError({ status: 403 })).toBeNull();
  });

  it("returns null for an ordinary invalid/expired code", () => {
    // This is the existing "Incorrect code" path — invalid OTP is a 400.
    expect(
      classifyOtpSignInError({ code: "INVALID_OTP", status: 400 }),
    ).toBeNull();
    expect(classifyOtpSignInError({ status: 400 })).toBeNull();
  });

  it("returns null when there is no error", () => {
    expect(classifyOtpSignInError(null)).toBeNull();
    expect(classifyOtpSignInError(undefined)).toBeNull();
  });
});
