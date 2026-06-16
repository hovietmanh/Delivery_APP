-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "todayDepartureTime" TEXT,
ADD COLUMN     "todayFromCity" TEXT,
ADD COLUMN     "todayPricePerKg" DOUBLE PRECISION,
ADD COLUMN     "todayToCity" TEXT;
