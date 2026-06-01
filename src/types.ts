import { Prisma } from "@/app/generated/prisma/client";

const SummaryWithChunksAndFile = Prisma.validator<Prisma.DocumentDefaultArgs>()(
  {
    include: {
      summaryChunks: true,
    },
  },
);

export type SummaryWithChunksAndFile = Prisma.DocumentGetPayload<
  typeof SummaryWithChunksAndFile
>;
