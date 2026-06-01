import { z } from "zod";

export const MetadataSchema = z.object({
  caseNumber: z.string().nullable(),
  caseTitle: z.string().nullable(),
  deponent: z.string().nullable(),
  depositionDate: z.string().nullable(),
  depositionLocation: z.string().nullable(),
  attorneysForPlaintiff: z.string().nullable(),
  attorneysForDefense: z.string().nullable(),
});

// fake schema example:
export const FAKE_METADATA: z.infer<typeof MetadataSchema> = {
  caseNumber: "1234567890",
  caseTitle: "Test Case",
  deponent: "John Doe",
  depositionDate: "2021-01-01",
  depositionLocation: "New York, NY",
  attorneysForPlaintiff: "John Doe, Jane Doe",
  attorneysForDefense: "John Doe, Jane Doe",
};
