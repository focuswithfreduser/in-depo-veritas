-- AlterTable
ALTER TABLE "order" ADD COLUMN     "zipFailedFileIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
