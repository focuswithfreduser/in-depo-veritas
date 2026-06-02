import type { DeepMockProxy } from "vitest-mock-extended";

import type { PrismaClient } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";

// `db` is replaced with a `mockDeep()` instance by `src/test/setup.ts`.
// Cast once here so test files get full type-aware autocomplete on
// `dbMock.<model>.<method>.mockResolvedValue(...)`.
export const dbMock = db as unknown as DeepMockProxy<PrismaClient>;
