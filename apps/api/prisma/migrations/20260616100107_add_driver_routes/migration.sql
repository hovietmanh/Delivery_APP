-- CreateTable
CREATE TABLE "driver_routes" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "fromCity" TEXT NOT NULL,
    "toCity" TEXT NOT NULL,

    CONSTRAINT "driver_routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_routes_driverId_fromCity_toCity_key" ON "driver_routes"("driverId", "fromCity", "toCity");

-- AddForeignKey
ALTER TABLE "driver_routes" ADD CONSTRAINT "driver_routes_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
