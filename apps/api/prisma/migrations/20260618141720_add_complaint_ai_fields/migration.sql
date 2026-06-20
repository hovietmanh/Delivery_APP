-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "aiAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "aiReason" TEXT,
ADD COLUMN     "aiVerdict" TEXT;
