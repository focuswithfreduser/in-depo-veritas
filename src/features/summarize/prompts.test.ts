import { describe, expect, it } from "vitest";

import {
  abstractFormat,
  buildLegalSummaryPrompt,
  getAbstractPrompt,
  METADATA_PROMPT,
} from "@/features/summarize/prompts";

describe("buildLegalSummaryPrompt", () => {
  it("embeds the current chunk inside <transcript_content> tags", () => {
    const prompt = buildLegalSummaryPrompt("Q: Did you see it? A: Yes.");
    expect(prompt).toContain("<transcript_content>");
    expect(prompt).toContain("Q: Did you see it? A: Yes.");
    expect(prompt).toContain("</transcript_content>");
  });

  it("includes the working summary when provided", () => {
    const prompt = buildLegalSummaryPrompt(
      "current chunk",
      "Previously the witness described the accident.",
    );
    expect(prompt).toContain("<working_summary>");
    expect(prompt).toContain(
      "Previously the witness described the accident.",
    );
    expect(prompt).not.toContain("This is the first chunk");
  });

  it("flags the first chunk when no working summary is given", () => {
    const prompt = buildLegalSummaryPrompt("first chunk");
    expect(prompt).toContain("This is the first chunk");
    expect(prompt).not.toContain("<working_summary>");
  });

  it("instructs the model to return isRelevant + summary", () => {
    const prompt = buildLegalSummaryPrompt("x");
    expect(prompt).toContain("isRelevant (boolean) and summary (string)");
  });
});

describe("getAbstractPrompt", () => {
  it("embeds the full summary text", () => {
    const prompt = getAbstractPrompt("FULL SUMMARY HERE");
    expect(prompt).toContain("FULL SUMMARY HERE");
  });

  it("specifies the three-paragraph format constraint", () => {
    const prompt = getAbstractPrompt("text");
    expect(prompt).toContain("Three paragraphs");
  });
});

describe("abstractFormat", () => {
  it("requires the abstract field", () => {
    const result = abstractFormat.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a minimal payload with just the abstract", () => {
    const result = abstractFormat.safeParse({ abstract: "hello" });
    expect(result.success).toBe(true);
  });

  it("accepts all optional metadata fields", () => {
    const result = abstractFormat.safeParse({
      abstract: "x",
      deponentName: "Jane Doe",
      depositionDate: "2026-01-02",
      caseNumber: "CASE-001",
      attorneysForPlaintiff: "A. Smith",
      attorneysForDefense: "B. Jones",
    });
    expect(result.success).toBe(true);
  });
});

describe("METADATA_PROMPT", () => {
  it("declares all extracted JSON fields", () => {
    for (const field of [
      "caseNumber",
      "caseTitle",
      "deponent",
      "depositionDate",
      "depositionLocation",
      "attorneysForPlaintiff",
      "attorneysForDefense",
    ]) {
      expect(METADATA_PROMPT).toContain(field);
    }
  });
});
