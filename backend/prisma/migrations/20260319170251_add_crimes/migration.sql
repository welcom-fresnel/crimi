-- AlterTable
ALTER TABLE "criminals" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "crimes" (
    "id" TEXT NOT NULL,
    "criminalId" TEXT NOT NULL,
    "crimeTypeId" TEXT NOT NULL,
    "crimeDate" TIMESTAMP(3),
    "crimeLocation" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dangerLevel" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crimes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crimes_criminalId_idx" ON "crimes"("criminalId");

-- CreateIndex
CREATE INDEX "crimes_crimeTypeId_idx" ON "crimes"("crimeTypeId");

-- CreateIndex
CREATE INDEX "crimes_status_idx" ON "crimes"("status");

-- AddForeignKey
ALTER TABLE "crimes" ADD CONSTRAINT "crimes_criminalId_fkey" FOREIGN KEY ("criminalId") REFERENCES "criminals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crimes" ADD CONSTRAINT "crimes_crimeTypeId_fkey" FOREIGN KEY ("crimeTypeId") REFERENCES "crime_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crimes" ADD CONSTRAINT "crimes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crimes" ADD CONSTRAINT "crimes_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
