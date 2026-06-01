import { z } from "zod";

export const abstractFormat = z.object({
  abstract: z.string(),
  deponentName: z.string().optional(),
  depositionDate: z.string().optional(),
  caseNumber: z.string().optional(),
  attorneysForPlaintiff: z.string().optional(),
  attorneysForDefense: z.string().optional(),
});

export function getAbstractPrompt(fullSummaryText: string) {
  const text = `
## Goal: 

- You are a professional legal case summarizer known for brevity.
- Create an abstract written from a larger deposition summary.

## Return format
- Three paragraphs of unformatted text with two to three sentences each.

## Task

- Give an abstract of the entire legal deposition summary provided below.
- Be concise, clear, and factual.
- Use short sentences.
- Focus on the most important aspects of the deposition.
- The deponent and their involvment to the case is extremly important.

Example starting sentence format:

"[Deponent name], a [job title] at [company], spoke about [topic]".

## Caution

- Do not use phrases like "in this deposition," "this summary," "the deponent stated," or similar references. 
- Present the information directly as factual statements. Focus only on the substance of what was said, using the witness's name followed by their statements in a clear, objective format. 
- Avoid meta-references to the document type or that you are summarizing.
- Again, phrases like "during a legal deposition" or "in the deposition" are not necessary!
- Do not use unnecessary legal jargon, adjectives, or opinions. 
- No need for transitions between paragraphs. "Throughout the session" or "in the following pages" are not needed!
- The logistics of the deposition are not important, i.e, do not include the location, date, time of the deposition itself.
- The reader already has the names of the attorneys, court reporter, case name, and case number. There's no need to include them.

## Context
What follows is the summary of the deposition. 

## Deposition Summary

${fullSummaryText}`;

  return text;
}

export function buildLegalSummaryPrompt(
  currentChunks: string,
  workingSummary?: string,
) {
  const text = `
## Context: 

You are a professional legal case summarizer. You craft legal case summaries
from provided depositions. A deposition is a
testimony taken down in writing under oath, but outside of court.

Your responses are short and to the point. 

## Task

You are in the middle of creating the deposition summary. You are being given
chunks of the deposition to summarize one at a time.
You will be provided with:

1. The summary created thus far of previous chunks, <working_summary />.
2. The current chunk to summarize, <current_chunk />.

## Instructions

1. Summarize this section of the deposition.
2. Rely strictly on the provided context, without including any external
information.
3. Provide at least three paragraphs of summary.
4. Response only in text (i.e. not markdown, no xml). 
Separate new lines by adding "\\n" at the end of the line.

  5. Because your response will be appended to the previous summary,
it is unnecessary to provide an opening sentence. Therefore, do not begin
with sentences such as "in this section of the legal deposition...", or
"The deposition involved", or "in the deposition", or "Paragraph 1:".

Your answer is a part of a bigger summary.

## Information Given

## Working Summary of Previous Chunks

${
  workingSummary
    ? `
<working_summary>
${workingSummary}
</working_summary>  
`
    : `No summary has been provided yet. This is the first chunk`
}

## Format

You must respond with a JSON object containing two fields: isRelevant (boolean) and summary (string).

If the current chunk appears to be deposition transcript content (actual testimony, questions and answers from the deposition), set isRelevant to true and provide a summary in the summary field.

If the current chunk is NOT deposition transcript content (for example: glossary, index, page headers, administrative text, or any other non-testimony content), set isRelevant to false and the summary can be a blank string.

CRITICAL: Never reply in a conversational tone. If you are not certain whether the content is deposition transcript content, mark isRelevant as false. Only mark isRelevant as true when you are confident the content contains actual deposition testimony.

Do not use phrases like "Here is the summary" or "This section contains" - provide only the direct summary content.


## Current Chunk

Here is the current section of the deposition for you to summarize:

<transcript_content>
${currentChunks}
</transcript_content>
`;

  return text;
}

export const METADATA_PROMPT = `
You are an expert legal assistant tasked with extracting key metadata from legal deposition transcripts.

Your task is to carefully extract the following information from the provided deposition transcript pages:

1. Case Number: Look for "CASE NO", "CASE NUMBER", "No.", "Case No.", or similar identifiers. Always check for this pattern explicitly.

2. Case Title: Usually in the format "[Plaintiff] vs. [Defendant]" or similar.

3. Deponent: The person being deposed/interviewed.

4. Deposition Date: When the deposition took place.

5. Deposition Location: Where the deposition took place.

6. Attorneys for Plaintiff: 
   - Look for explicit mention of "for the Plaintiff" or "representing the Plaintiff"
   - Note the full names of all attorneys representing the plaintiff
   - Include their law firm names in parentheses if available
   - Make sure not to confuse with defense attorneys
   - Format as "Attorney Name (Law Firm)" or just "Attorney Name" if firm unknown

  7. Attorneys for Defense: 
   - Look for explicit mention of "for the Defendant/Defense" or "representing the Defendant/Defense"
   - Note the full names of all attorneys representing the defense
   - Include their law firm names in parentheses if available
   - Make sure not to confuse with plaintiff attorneys
   - Format as "Attorney Name (Law Firm)" or just "Attorney Name" if firm unknown


IMPORTANT GUIDELINES:
- For case numbers, specifically look for "CASE NO" or similar patterns followed by alphanumeric identifiers
- Pay close attention to which attorneys represent which party by looking for explicit statements
- If information is not present, use null
- Some fields may have multiple entries (e.g., multiple attorneys) - list them separated by commas
- Extract information exactly as written in the document
- Do not make assumptions about roles based solely on names or order of appearance
  - If any name is in all capital letters, change it to be proper casing. Change no details about the name other than the casing.


Respond with a valid JSON object containing these fields:
{
  "caseNumber": string or null,
  "caseTitle": string or null,
  "deponent": string or null,
  "depositionDate": string or null,
  "depositionLocation": string or null,
  "attorneysForPlaintiff": string or null,
  "attorneysForDefense": string or null
}`;
