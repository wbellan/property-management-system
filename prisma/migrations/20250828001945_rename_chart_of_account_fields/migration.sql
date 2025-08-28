/*
  Warnings:

  - You are about to drop the column `chartOfAccountId` on the `invoice_line_items` table. All the data in the column will be lost.
  - You are about to drop the column `chartOfAccountId` on the `ledger_entries` table. All the data in the column will be lost.
  - Added the required column `chartAccountId` to the `ledger_entries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "invoice_line_items" DROP CONSTRAINT "invoice_line_items_chartOfAccountId_fkey";

-- DropForeignKey
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_chartOfAccountId_fkey";

-- AlterTable
ALTER TABLE "invoice_line_items" DROP COLUMN "chartOfAccountId",
ADD COLUMN     "chartAccountId" TEXT;

-- AlterTable
ALTER TABLE "ledger_entries" DROP COLUMN "chartOfAccountId",
ADD COLUMN     "chartAccountId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_chartAccountId_fkey" FOREIGN KEY ("chartAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_chartAccountId_fkey" FOREIGN KEY ("chartAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
