// services/balance-calculator.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BalanceCalculatorService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Calculate the current balance for a specific bank ledger
     */
    async calculateBankLedgerBalance(bankLedgerId: string): Promise<Decimal> {
        const entries = await this.prisma.ledgerEntry.findMany({
            where: { bankLedgerId },
        });

        return entries.reduce((balance, entry) => {
            // For bank accounts: DEBIT increases balance, CREDIT decreases balance
            return entry.transactionType === 'DEBIT'
                ? balance.plus(entry.amount)
                : balance.minus(entry.amount);
        }, new Decimal(0));
    }

    /**
     * Calculate balance for a chart account across all bank ledgers in an entity
     */
    async calculateChartAccountBalance(chartAccountId: string): Promise<Decimal> {
        const entries = await this.prisma.ledgerEntry.findMany({
            where: { chartAccountId },
        });

        const account = await this.prisma.chartAccount.findUnique({
            where: { id: chartAccountId },
        });

        if (!account) {
            return new Decimal(0);
        }

        return entries.reduce((balance, entry) => {
            // Normal balances: Assets/Expenses = DEBIT, Liabilities/Equity/Revenue = CREDIT
            const normalDebitTypes = ['ASSET', 'EXPENSE'];
            const isNormalDebit = normalDebitTypes.includes(account.accountType);

            if (isNormalDebit) {
                return entry.transactionType === 'DEBIT'
                    ? balance.plus(entry.amount)
                    : balance.minus(entry.amount);
            } else {
                return entry.transactionType === 'CREDIT'
                    ? balance.plus(entry.amount)
                    : balance.minus(entry.amount);
            }
        }, new Decimal(0));
    }

    /**
     * Get trial balance for an entity (all chart accounts with their balances)
     */
    async getTrialBalance(entityId: string): Promise<any[]> {
        const accounts = await this.prisma.chartAccount.findMany({
            where: {
                entityId,
                isActive: true,
            },
            include: {
                ledgerEntries: true,
            },
            orderBy: {
                accountCode: 'asc',
            },
        });

        const trialBalance = await Promise.all(
            accounts.map(async (account) => {
                const balance = await this.calculateChartAccountBalance(account.id);
                return {
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    accountType: account.accountType,
                    balance: balance.toString(),
                    isDebitBalance: this.isDebitBalance(account.accountType, balance),
                };
            })
        );

        return trialBalance;
    }

    /**
     * Validate double-entry bookkeeping for a set of entries
     */
    validateDoubleEntry(entries: Array<{ transactionType: string; amount: Decimal }>): boolean {
        const totalDebits = entries
            .filter(e => e.transactionType === 'DEBIT')
            .reduce((sum, e) => sum.plus(e.amount), new Decimal(0));

        const totalCredits = entries
            .filter(e => e.transactionType === 'CREDIT')
            .reduce((sum, e) => sum.plus(e.amount), new Decimal(0));

        return totalDebits.equals(totalCredits);
    }

    /**
     * Get financial summary for an entity
     */
    async getFinancialSummary(entityId: string) {
        const trialBalance = await this.getTrialBalance(entityId);

        const assets = trialBalance
            .filter(acc => acc.accountType === 'ASSET')
            .reduce((sum, acc) => sum.plus(new Decimal(acc.balance)), new Decimal(0));

        const liabilities = trialBalance
            .filter(acc => acc.accountType === 'LIABILITY')
            .reduce((sum, acc) => sum.plus(new Decimal(acc.balance)), new Decimal(0));

        const equity = trialBalance
            .filter(acc => acc.accountType === 'EQUITY')
            .reduce((sum, acc) => sum.plus(new Decimal(acc.balance)), new Decimal(0));

        const revenue = trialBalance
            .filter(acc => acc.accountType === 'REVENUE')
            .reduce((sum, acc) => sum.plus(new Decimal(acc.balance)), new Decimal(0));

        const expenses = trialBalance
            .filter(acc => acc.accountType === 'EXPENSE')
            .reduce((sum, acc) => sum.plus(new Decimal(acc.balance)), new Decimal(0));

        const netIncome = revenue.minus(expenses);
        const totalEquity = equity.plus(netIncome);

        return {
            assets: assets.toString(),
            liabilities: liabilities.toString(),
            equity: totalEquity.toString(),
            revenue: revenue.toString(),
            expenses: expenses.toString(),
            netIncome: netIncome.toString(),
            balanceSheetBalance: assets.minus(liabilities.plus(totalEquity)).toString(),
            isBalanced: assets.equals(liabilities.plus(totalEquity)),
        };
    }

    private isDebitBalance(accountType: string, balance: Decimal): boolean {
        const debitTypes = ['ASSET', 'EXPENSE'];
        const isDebitAccount = debitTypes.includes(accountType);

        if (isDebitAccount) {
            return balance.greaterThanOrEqualTo(0);
        } else {
            return balance.lessThan(0);
        }
    }
}