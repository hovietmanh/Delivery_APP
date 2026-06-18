-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ComplaintStatus" ADD VALUE 'AWAITING_BANK_INFO';
ALTER TYPE "ComplaintStatus" ADD VALUE 'AWAITING_TRANSFER';

-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "apologyMessage" TEXT,
ADD COLUMN     "apologyVoucherCode" TEXT,
ADD COLUMN     "customerBankAccount" TEXT,
ADD COLUMN     "driverVerdict" TEXT;

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "forCustomerId" TEXT;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_forCustomerId_fkey" FOREIGN KEY ("forCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
