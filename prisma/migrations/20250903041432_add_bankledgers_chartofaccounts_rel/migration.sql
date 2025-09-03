/*
  Warnings:

  - Added the required column `chartAccountId` to the `bank_ledgers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bank_ledgers" ADD COLUMN     "chartAccountId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "bank_ledgers" ADD CONSTRAINT "bank_ledgers_chartAccountId_fkey" FOREIGN KEY ("chartAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
