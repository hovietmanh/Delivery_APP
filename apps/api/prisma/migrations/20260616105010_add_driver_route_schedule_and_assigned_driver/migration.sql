-- AlterTable
ALTER TABLE "driver_routes" ADD COLUMN     "departureTimes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "durationHours" INTEGER,
ADD COLUMN     "pricePerKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "assignedDriverId" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
