/*
  Warnings:

  - The values [UTILITIES] on the enum `InvoiceType` will be removed. If these variants are still used in the database, this will fail.
  - The values [CASH,CHECK,CREDIT_CARD,BANK_TRANSFER] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `amount` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `chartAccountId` on the `ledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paymentNumber]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `entityId` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chartOfAccountId` to the `ledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payerName` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentNumber` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentType` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'CHECK', 'ACH', 'CREDIT_CARD', 'BANK_TRANSFER', 'MONEY_ORDER', 'WIRE_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentProcessingStatus" AS ENUM ('UNPROCESSED', 'PROCESSING', 'CLEARED', 'BOUNCED', 'DISPUTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvoiceStatus" ADD VALUE 'VIEWED';
ALTER TYPE "InvoiceStatus" ADD VALUE 'PARTIAL_PAYMENT';
ALTER TYPE "InvoiceStatus" ADD VALUE 'VOID';

-- AlterEnum
BEGIN;
CREATE TYPE "InvoiceType_new" AS ENUM ('RENT', 'LATE_FEE', 'UTILITY', 'MAINTENANCE', 'PARKING', 'PET_FEE', 'SECURITY_DEPOSIT', 'OTHER', 'VENDOR_BILL', 'NNN');
ALTER TABLE "invoices" ALTER COLUMN "invoiceType" TYPE "InvoiceType_new" USING ("invoiceType"::text::"InvoiceType_new");
ALTER TYPE "InvoiceType" RENAME TO "InvoiceType_old";
ALTER TYPE "InvoiceType_new" RENAME TO "InvoiceType";
DROP TYPE "InvoiceType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('ONLINE', 'MANUAL', 'AUTO_DEBIT', 'MAIL', 'IN_PERSON');
ALTER TABLE "payments" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING ("paymentMethod"::text::"PaymentMethod_new");
ALTER TABLE "rent_payments" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING ("paymentMethod"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "PaymentMethod_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_chartAccountId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoiceId_fkey";

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "amount",
DROP COLUMN "notes",
ADD COLUMN     "balanceAmount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "issueDate" TIMESTAMP(3),
ADD COLUMN     "lateFeeAmount" DECIMAL(15,2),
ADD COLUMN     "lateFeeApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateFeeDays" INTEGER,
ADD COLUMN     "memo" TEXT,
ADD COLUMN     "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "parentInvoiceId" TEXT,
ADD COLUMN     "propertyId" TEXT,
ADD COLUMN     "recurringRule" TEXT,
ADD COLUMN     "spaceId" TEXT,
ADD COLUMN     "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "terms" TEXT,
ADD COLUMN     "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "vendorId" TEXT,
ALTER COLUMN "leaseId" DROP NOT NULL,
ALTER COLUMN "invoiceType" SET DEFAULT 'RENT';

-- AlterTable
ALTER TABLE "ledger_entries" DROP COLUMN "chartAccountId",
ADD COLUMN     "chartOfAccountId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "invoiceId",
DROP COLUMN "notes",
ADD COLUMN     "bankLedgerId" TEXT,
ADD COLUMN     "depositDate" TIMESTAMP(3),
ADD COLUMN     "depositId" TEXT,
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "isDeposited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memo" TEXT,
ADD COLUMN     "nextRetryDate" TIMESTAMP(3),
ADD COLUMN     "payerEmail" TEXT,
ADD COLUMN     "payerId" TEXT,
ADD COLUMN     "payerName" TEXT NOT NULL,
ADD COLUMN     "paymentNumber" TEXT NOT NULL,
ADD COLUMN     "paymentType" "PaymentType" NOT NULL,
ADD COLUMN     "processingFee" DECIMAL(15,2),
ADD COLUMN     "processingStatus" "PaymentProcessingStatus" NOT NULL DEFAULT 'UNPROCESSED',
ADD COLUMN     "receivedDate" TIMESTAMP(3),
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "paymentDate" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "lineTotal" DECIMAL(15,2) NOT NULL,
    "chartOfAccountId" TEXT,
    "propertyId" TEXT,
    "spaceId" TEXT,
    "itemCode" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_applications" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "appliedAmount" DECIMAL(15,2) NOT NULL,
    "appliedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_attachments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attachments" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_line_items_invoiceId_lineNumber_key" ON "invoice_line_items"("invoiceId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payment_applications_paymentId_invoiceId_key" ON "payment_applications"("paymentId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_parentInvoiceId_fkey" FOREIGN KEY ("parentInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bankLedgerId_fkey" FOREIGN KEY ("bankLedgerId") REFERENCES "bank_ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_attachments" ADD CONSTRAINT "invoice_attachments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_attachments" ADD CONSTRAINT "invoice_attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attachments" ADD CONSTRAINT "payment_attachments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attachments" ADD CONSTRAINT "payment_attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
