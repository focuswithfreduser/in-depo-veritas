import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { absoluteUrl, convertNewlines, formatDate } from "@/components/utils";

describe("formatDate", () => {
  it("formats an ISO date string in en-US long form", () => {
    expect(formatDate("2026-03-05T12:00:00.000Z")).toMatch(/March \d+, 2026/);
  });

  it("accepts a numeric timestamp", () => {
    const ts = new Date("2026-12-31T00:00:00.000Z").getTime();
    expect(formatDate(ts)).toContain("2026");
  });
});

describe("convertNewlines", () => {
  it("converts literal backslash-n into real newlines", () => {
    expect(convertNewlines("line1\\nline2")).toBe("line1\nline2");
  });

  it("leaves text without escapes untouched", () => {
    expect(convertNewlines("hello world")).toBe("hello world");
  });
});

describe("absoluteUrl", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = original;
    }
  });

  it("prefixes the path with NEXT_PUBLIC_APP_URL", () => {
    expect(absoluteUrl("/billing")).toBe("https://example.com/billing");
  });
});
