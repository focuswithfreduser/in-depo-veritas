import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

// Skip env validation so importing modules that read `env` from
// `@/create-env.mjs` doesn't blow up under Vitest.
process.env.SKIP_ENV_VALIDATION = "1";
process.env.USE_TEST_PROVIDERS = "true";
// Vitest already sets NODE_ENV=test; @types/node marks it readonly so we
// avoid reassigning here.

// Shared deep mock for the Prisma client. The same instance is returned
// for both `db` and `prisma` named exports of `@/lib/db`.
const prismaMock = mockDeep();

vi.mock("@/lib/db", () => ({
  db: prismaMock,
  prisma: prismaMock,
}));

// Re-export for test files: importing `db` from `@/lib/db` is the
// canonical pattern; for typed access in assertions use `dbMock` below.
export { prismaMock as dbMock };

// Supabase: feature code touches `getUploadUrl` / `getDownloadUrl` /
// `uploadFile` / `getFileBlob` / `deleteFile`. Replace each with a
// `vi.fn()` so tests can stub return values per-case.
vi.mock("@/lib/supabase-service", () => ({
  DOCUMENTS_BUCKET: "documents",
  supabaseService: {},
  getUploadUrl: vi.fn(),
  getDownloadUrl: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  getFileBlob: vi.fn(),
}));

// Better Auth: no production session resolution under tests.
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Vercel AI SDK: stub the three entry points actually used by the
// codebase. Tests provide return values per-suite.
vi.mock("ai", async () => {
  return {
    generateText: vi.fn(),
    generateObject: vi.fn(),
    streamText: vi.fn(),
  };
});

// p-retry should not actually delay or retry in tests; just invoke once.
vi.mock("p-retry", () => ({
  default: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

// Trigger.dev document task: don't enqueue anything.
vi.mock("@/trigger/document-task", () => ({
  triggerDocument: vi.fn(),
}));

// Resend / email sender.
vi.mock("@/services/email/resend", () => ({
  sendEmail: vi.fn(),
}));

// Stripe metered usage helpers.
vi.mock("@/server/utils/stripe", () => ({
  recordMeteredUsage: vi.fn(),
  cancelMeteredUsage: vi.fn(),
}));

// Reset all mocks between every test.
beforeEach(() => {
  mockReset(prismaMock);
  vi.clearAllMocks();
});
