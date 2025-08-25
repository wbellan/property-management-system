/*
  Warnings:

  - The `propertyType` column on the `properties` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `bathrooms` on the `spaces` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(3,1)`.
  - Added the required column `propertyId` to the `leases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `spaces` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'INDUSTRIAL', 'RETAIL', 'OFFICE', 'WAREHOUSE', 'LAND');

-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('UNIT', 'APARTMENT', 'OFFICE', 'RETAIL', 'WAREHOUSE', 'PARKING', 'STORAGE', 'COMMON_AREA', 'AMENITY', 'OTHER');

-- CreateEnum
CREATE TYPE "SpaceStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "leases" ADD COLUMN     "propertyId" TEXT NOT NULL,
ADD COLUMN     "renewalTerms" TEXT,
ADD COLUMN     "specialTerms" TEXT,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "currentMarketValue" DECIMAL(12,2),
ADD COLUMN     "lotSize" INTEGER,
ADD COLUMN     "purchasePrice" DECIMAL(12,2),
ADD COLUMN     "squareFootage" INTEGER,
ADD COLUMN     "totalSpaces" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "propertyType",
ADD COLUMN     "propertyType" "PropertyType" NOT NULL DEFAULT 'RESIDENTIAL';

-- AlterTable
ALTER TABLE "spaces" ADD COLUMN     "amenities" TEXT,
ADD COLUMN     "deposit" DECIMAL(10,2),
ADD COLUMN     "floorNumber" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "rent" DECIMAL(10,2),
ADD COLUMN     "squareFootage" INTEGER,
ADD COLUMN     "status" "SpaceStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "type" "SpaceType" NOT NULL DEFAULT 'UNIT',
ALTER COLUMN "bathrooms" SET DATA TYPE DECIMAL(3,1);

-- CreateTable
CREATE TABLE "property_images" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_images" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "property_images_propertyId_idx" ON "property_images"("propertyId");

-- CreateIndex
CREATE INDEX "space_images_spaceId_idx" ON "space_images"("spaceId");

-- CreateIndex
CREATE INDEX "leases_spaceId_idx" ON "leases"("spaceId");

-- CreateIndex
CREATE INDEX "leases_propertyId_idx" ON "leases"("propertyId");

-- CreateIndex
CREATE INDEX "leases_tenantId_idx" ON "leases"("tenantId");

-- CreateIndex
CREATE INDEX "leases_status_idx" ON "leases"("status");

-- CreateIndex
CREATE INDEX "properties_entityId_idx" ON "properties"("entityId");

-- CreateIndex
CREATE INDEX "properties_propertyType_idx" ON "properties"("propertyType");

-- CreateIndex
CREATE INDEX "properties_city_state_idx" ON "properties"("city", "state");

-- CreateIndex
CREATE INDEX "spaces_propertyId_idx" ON "spaces"("propertyId");

-- CreateIndex
CREATE INDEX "spaces_status_idx" ON "spaces"("status");

-- CreateIndex
CREATE INDEX "spaces_type_idx" ON "spaces"("type");

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_images" ADD CONSTRAINT "space_images_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
