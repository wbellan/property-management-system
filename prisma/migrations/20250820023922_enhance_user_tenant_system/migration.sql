/*
  Warnings:

  - A unique constraint covering the columns `[inviteToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inviteExpires" TIMESTAMP(3),
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "invitedBy" TEXT;

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "ssn" TEXT,
    "isBusinessTenant" BOOLEAN NOT NULL DEFAULT false,
    "businessName" TEXT,
    "businessTaxId" TEXT,
    "previousLandlord" TEXT,
    "employerInfo" TEXT,
    "monthlyIncome" DECIMAL(10,2),
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_userId_key" ON "tenants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_inviteToken_key" ON "users"("inviteToken");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
