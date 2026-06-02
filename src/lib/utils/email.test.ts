import { describe, expect, it } from "vitest";

import { getEmailData } from "@/lib/utils/email";

describe("getEmailData", () => {
  it("classifies a public provider", () => {
    const data = getEmailData("user@gmail.com");
    expect(data.type).toBe("public");
    expect(data.domain).toBe("gmail.com");
  });

  it("classifies a known temporary-email provider", () => {
    const data = getEmailData("nope@mailinator.com");
    expect(data.type).toBe("temporary");
  });

  it("classifies a private business domain", () => {
    const data = getEmailData("user@acme.example");
    expect(data.type).toBe("private");
    expect(data.domain).toBe("acme.example");
  });

  it("throws for an invalid email format", () => {
    expect(() => getEmailData("not-an-email")).toThrow("Invalid email format");
  });

  it("normalizes the domain casing", () => {
    const data = getEmailData("user@Gmail.COM");
    expect(data.domain).toBe("gmail.com");
  });
});
