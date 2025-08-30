/*
  Warnings:

  - Changed the type of `accountType` on the `bank_ledgers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CHECKING', 'SAVINGS', 'MONEY_MARKET', 'CD', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('MANUAL', 'AUTOMATIC', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'RECONCILIATION');

-- AlterTable
ALTER TABLE "bank_ledgers" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "routingNumber" TEXT,
DROP COLUMN "accountType",
ADD COLUMN     "accountType" "BankAccountType" NOT NULL;

-- AlterTable
ALTER TABLE "chart_of_accounts" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "creditAmount" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "debitAmount" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entryType" "EntryType" DEFAULT 'MANUAL',
ADD COLUMN     "referenceId" TEXT;

-- CreateTable
CREATE TABLE "bank_statements" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "statementStartDate" TIMESTAMP(3) NOT NULL,
    "statementEndDate" TIMESTAMP(3) NOT NULL,
    "openingBalance" DECIMAL(15,2) NOT NULL,
    "closingBalance" DECIMAL(15,2) NOT NULL,
    "statementReference" TEXT,
    "importedById" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "bankStatementId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "transactionType" TEXT NOT NULL,
    "runningBalance" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_reconciliations" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "bankStatementId" TEXT NOT NULL,
    "reconciliationDate" TIMESTAMP(3) NOT NULL,
    "reconciledById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_matches" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "ledgerEntryId" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "matchNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_matches_ledgerEntryId_key" ON "reconciliation_matches"("ledgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_matches_bankTransactionId_key" ON "reconciliation_matches"("bankTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_matches_ledgerEntryId_bankTransactionId_key" ON "reconciliation_matches"("ledgerEntryId", "bankTransactionId");

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "bank_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "bank_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_reconciledById_fkey" FOREIGN KEY ("reconciledById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_matches" ADD CONSTRAINT "reconciliation_matches_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "bank_reconciliations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_matches" ADD CONSTRAINT "reconciliation_matches_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_matches" ADD CONSTRAINT "reconciliation_matches_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "bank_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
