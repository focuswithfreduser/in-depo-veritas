import { describe, expect, it } from "vitest";

import {
  cn,
  displayNumber,
  ensureError,
  formatBytes,
  formatDecimal,
  formatEmail,
  pluralize,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("dedupes conflicting tailwind utilities (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignores falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("formatBytes", () => {
  it("returns '0 Bytes' for 0", () => {
    expect(formatBytes(0)).toBe("0 Bytes");
  });

  it("formats bytes under 1 KB", () => {
    expect(formatBytes(512)).toBe("512 Bytes");
  });

  it("formats KB", () => {
    expect(formatBytes(2048)).toBe("2 KB");
  });

  it("formats MB", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
  });

  it("respects the decimals argument", () => {
    expect(formatBytes(1500, 2)).toBe("1.46 KB");
  });

  it("clamps negative decimals to zero", () => {
    expect(formatBytes(2048, -3)).toBe("2 KB");
  });
});

describe("ensureError", () => {
  it("returns the same instance for an Error", () => {
    const e = new Error("boom");
    expect(ensureError(e)).toBe(e);
  });

  it("wraps non-Error values with the stringified payload", () => {
    const wrapped = ensureError({ code: 42 });
    expect(wrapped).toBeInstanceOf(Error);
    expect(wrapped.message).toContain('{"code":42}');
  });

  it("handles values that cannot be stringified", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const wrapped = ensureError(circular);
    expect(wrapped).toBeInstanceOf(Error);
    expect(wrapped.message).toContain("Unable to stringify");
  });
});

describe("displayNumber", () => {
  it("returns empty string for undefined", () => {
    expect(displayNumber(undefined)).toBe("");
  });

  it("returns empty string for NaN", () => {
    expect(displayNumber(Number.NaN)).toBe("");
  });

  it("formats with thousand separators", () => {
    expect(displayNumber(1234567)).toBe("1,234,567");
  });

  it("rounds to two decimal places", () => {
    expect(displayNumber(1234.567)).toBe("1,234.57");
  });
});

describe("formatDecimal", () => {
  it("rounds to two decimals by default", () => {
    expect(formatDecimal(1.2345)).toBe(1.23);
  });

  it("respects the decimals argument", () => {
    expect(formatDecimal(1.5678, 3)).toBe(1.568);
  });
});

describe("pluralize", () => {
  it("returns the singular form when count is 1", () => {
    expect(pluralize(1, "credit", "credits")).toBe(" credit ");
  });

  it("returns the plural form for any other count", () => {
    expect(pluralize(0, "credit", "credits")).toBe(" credits ");
    expect(pluralize(2, "credit", "credits")).toBe(" credits ");
  });
});

describe("formatEmail", () => {
  it("lowercases and trims", () => {
    expect(formatEmail("  USER@Example.COM  ")).toBe("user@example.com");
  });
});
