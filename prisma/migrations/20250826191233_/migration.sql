/*
  Warnings:

  - You are about to drop the column `leaseTerms` on the `leases` table. All the data in the column will be lost.
  - You are about to drop the column `squareFeet` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `totalUnits` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `floor` on the `spaces` table. All the data in the column will be lost.
  - You are about to drop the column `spaceType` on the `spaces` table. All the data in the column will be lost.
  - You are about to drop the column `squareFeet` on the `spaces` table. All the data in the column will be lost.
  - You are about to drop the column `unitNumber` on the `spaces` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "spaces_propertyId_unitNumber_key";

-- AlterTable
ALTER TABLE "leases" DROP COLUMN "leaseTerms";

-- AlterTable
ALTER TABLE "properties" DROP COLUMN "squareFeet",
DROP COLUMN "totalUnits";

-- AlterTable
ALTER TABLE "spaces" DROP COLUMN "floor",
DROP COLUMN "spaceType",
DROP COLUMN "squareFeet",
DROP COLUMN "unitNumber";
