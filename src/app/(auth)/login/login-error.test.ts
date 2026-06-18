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

  it("treats a bare 403 as a suspension even without the code", () => {
    expect(classifyOtpSignInError({ status: 403 })).toBe("suspended");
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
