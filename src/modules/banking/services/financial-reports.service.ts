import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BalanceCalculatorService } from './balance-calculator.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface TrialBalanceItem {
    accountCode: string;
    accountName: string;
    accountType: string;
    debitBalance: string;
    creditBalance: string;
}

export interface IncomeStatementItem {
    accountCode: string;
    accountName: string;
    amount: string;
}

export interface BalanceSheetItem {
    accountCode: string;
    accountName: string;
    amount: string;
    children?: BalanceSheetItem[];
}

export interface CashFlowItem {
    description: string;
    amount: string;
    category: 'OPERATING' | 'INVESTING' | 'FINANCING';
}

@Injectable()
export class FinancialReportsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly balanceCalculator: BalanceCalculatorService,
    ) { }

    async getTrialBalance(entityId: string, asOfDate?: string): Promise<TrialBalanceItem[]> {
        const entity = await this.prisma.entity.findUnique({
            where: { id: entityId },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        const accounts = await this.prisma.chartAccount.findMany({
            where: {
                entityId,
                isActive: true,
            },
            include: {
                ledgerEntries: asOfDate ? {
                    where: {
                        transactionDate: {
                            lte: new Date(asOfDate),
                        },
                    },
                } : true,
            },
            orderBy: {
                accountCode: 'asc',
            },
        });

        const trialBalance: TrialBalanceItem[] = [];
        let totalDebits = new Decimal(0);
        let totalCredits = new Decimal(0);

        for (const account of accounts) {
            const balance = await this.calculateAccountBalance(account.ledgerEntries);
            const isDebitAccount = ['ASSET', 'EXPENSE'].includes(account.accountType);

            let debitBalance = new Decimal(0);
            let creditBalance = new Decimal(0);

            if (isDebitAccount) {
                debitBalance = balance.gt(0) ? balance : new Decimal(0);
                creditBalance = balance.lt(0) ? balance.abs() : new Decimal(0);
            } else {
                creditBalance = balance.gt(0) ? balance : new Decimal(0);
                debitBalance = balance.lt(0) ? balance.abs() : new Decimal(0);
            }

            totalDebits = totalDebits.plus(debitBalance);
            totalCredits = totalCredits.plus(creditBalance);

            if (!debitBalance.eq(0) || !creditBalance.eq(0)) {
                trialBalance.push({
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    accountType: account.accountType,
                    debitBalance: debitBalance.toString(),
                    creditBalance: creditBalance.toString(),
                });
            }
        }

        // Add totals row
        trialBalance.push({
            accountCode: 'TOTAL',
            accountName: 'TOTAL',
            accountType: 'TOTAL',
            debitBalance: totalDebits.toString(),
            creditBalance: totalCredits.toString(),
        });

        return trialBalance;
    }

    async getIncomeStatement(entityId: string, startDate: string, endDate: string) {
        const entity = await this.prisma.entity.findUnique({
            where: { id: entityId },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        const accounts = await this.prisma.chartAccount.findMany({
            where: {
                entityId,
                accountType: {
                    in: ['REVENUE', 'EXPENSE'],
                },
                isActive: true,
            },
            include: {
                ledgerEntries: {
                    where: {
                        transactionDate: {
                            gte: new Date(startDate),
                            lte: new Date(endDate),
                        },
                    },
                },
            },
            orderBy: {
                accountCode: 'asc',
            },
        });

        const revenue: IncomeStatementItem[] = [];
        const expenses: IncomeStatementItem[] = [];
        let totalRevenue = new Decimal(0);
        let totalExpenses = new Decimal(0);

        for (const account of accounts) {
            const balance = await this.calculateAccountBalance(account.ledgerEntries);

            if (!balance.eq(0)) {
                const item = {
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    amount: balance.toString(),
                };

                if (account.accountType === 'REVENUE') {
                    revenue.push(item);
                    totalRevenue = totalRevenue.plus(balance);
                } else {
                    expenses.push(item);
                    totalExpenses = totalExpenses.plus(balance);
                }
            }
        }

        const netIncome = totalRevenue.minus(totalExpenses);

        return {
            period: { startDate, endDate },
            revenue: {
                items: revenue,
                total: totalRevenue.toString(),
            },
            expenses: {
                items: expenses,
                total: totalExpenses.toString(),
            },
            netIncome: netIncome.toString(),
        };
    }

    async getBalanceSheet(entityId: string, asOfDate?: string) {
        const entity = await this.prisma.entity.findUnique({
            where: { id: entityId },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        const accounts = await this.prisma.chartAccount.findMany({
            where: {
                entityId,
                accountType: {
                    in: ['ASSET', 'LIABILITY', 'EQUITY'],
                },
                isActive: true,
            },
            include: {
                ledgerEntries: asOfDate ? {
                    where: {
                        transactionDate: {
                            lte: new Date(asOfDate),
                        },
                    },
                } : true,
            },
            orderBy: {
                accountCode: 'asc',
            },
        });

        const assets: BalanceSheetItem[] = [];
        const liabilities: BalanceSheetItem[] = [];
        const equity: BalanceSheetItem[] = [];

        let totalAssets = new Decimal(0);
        let totalLiabilities = new Decimal(0);
        let totalEquity = new Decimal(0);

        for (const account of accounts) {
            const balance = await this.calculateAccountBalance(account.ledgerEntries);

            if (!balance.eq(0)) {
                const item = {
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    amount: balance.toString(),
                };

                switch (account.accountType) {
                    case 'ASSET':
                        assets.push(item);
                        totalAssets = totalAssets.plus(balance);
                        break;
                    case 'LIABILITY':
                        liabilities.push(item);
                        totalLiabilities = totalLiabilities.plus(balance);
                        break;
                    case 'EQUITY':
                        equity.push(item);
                        totalEquity = totalEquity.plus(balance);
                        break;
                }
            }
        }

        return {
            asOfDate: asOfDate || new Date().toISOString(),
            assets: {
                items: assets,
                total: totalAssets.toString(),
            },
            liabilities: {
                items: liabilities,
                total: totalLiabilities.toString(),
            },
            equity: {
                items: equity,
                total: totalEquity.toString(),
            },
            totalLiabilitiesAndEquity: totalLiabilities.plus(totalEquity).toString(),
        };
    }

    async getCashFlowStatement(entityId: string, startDate: string, endDate: string) {
        const entity = await this.prisma.entity.findUnique({
            where: { id: entityId },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        // Get all ledger entries for the period
        const ledgerEntries = await this.prisma.ledgerEntry.findMany({
            where: {
                entityId,
                transactionDate: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
            include: {
                chartAccount: true,
                bankLedger: true,
            },
            orderBy: {
                transactionDate: 'asc',
            },
        });

        const operatingActivities: CashFlowItem[] = [];
        const investingActivities: CashFlowItem[] = [];
        const financingActivities: CashFlowItem[] = [];

        let netOperatingCash = new Decimal(0);
        let netInvestingCash = new Decimal(0);
        let netFinancingCash = new Decimal(0);

        for (const entry of ledgerEntries) {
            const amount = entry.transactionType === 'DEBIT'
                ? entry.amount
                : entry.amount.negated();

            let category: 'OPERATING' | 'INVESTING' | 'FINANCING' = 'OPERATING';

            // Categorize based on account type and nature
            if (entry.chartAccount.accountType === 'REVENUE' ||
                entry.chartAccount.accountType === 'EXPENSE') {
                category = 'OPERATING';
                netOperatingCash = netOperatingCash.plus(amount);
            } else if (entry.chartAccount.accountName.toLowerCase().includes('equipment') ||
                entry.chartAccount.accountName.toLowerCase().includes('building') ||
                entry.chartAccount.accountName.toLowerCase().includes('investment')) {
                category = 'INVESTING';
                netInvestingCash = netInvestingCash.plus(amount);
            } else if (entry.chartAccount.accountName.toLowerCase().includes('loan') ||
                entry.chartAccount.accountName.toLowerCase().includes('mortgage') ||
                entry.chartAccount.accountName.toLowerCase().includes('equity')) {
                category = 'FINANCING';
                netFinancingCash = netFinancingCash.plus(amount);
            }

            const cashFlowItem: CashFlowItem = {
                description: entry.description,
                amount: amount.toString(),
                category,
            };

            switch (category) {
                case 'OPERATING':
                    operatingActivities.push(cashFlowItem);
                    break;
                case 'INVESTING':
                    investingActivities.push(cashFlowItem);
                    break;
                case 'FINANCING':
                    financingActivities.push(cashFlowItem);
                    break;
            }
        }

        const netCashFlow = netOperatingCash.plus(netInvestingCash).plus(netFinancingCash);

        return {
            period: { startDate, endDate },
            operatingActivities: {
                items: operatingActivities,
                total: netOperatingCash.toString(),
            },
            investingActivities: {
                items: investingActivities,
                total: netInvestingCash.toString(),
            },
            financingActivities: {
                items: financingActivities,
                total: netFinancingCash.toString(),
            },
            netCashFlow: netCashFlow.toString(),
        };
    }

    async getBankReconciliationReport(entityId: string, bankAccountId: string, month?: string) {
        const bankAccount = await this.prisma.bankLedger.findFirst({
            where: { id: bankAccountId, entityId },
        });

        if (!bankAccount) {
            throw new NotFoundException('Bank account not found');
        }

        const startDate = month ? new Date(`${month}-01`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

        const reconciliations = await this.prisma.bankReconciliation.findMany({
            where: {
                bankAccountId,
                reconciliationDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                bankStatement: true,
                matches: {
                    include: {
                        ledgerEntry: {
                            include: {
                                chartAccount: true,
                            },
                        },
                        bankTransaction: true,
                    },
                },
            },
            orderBy: {
                reconciliationDate: 'desc',
            },
        });

        return {
            bankAccount: {
                id: bankAccount.id,
                accountName: bankAccount.accountName,
                bankName: bankAccount.bankName,
                accountNumber: bankAccount.accountNumber,
            },
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            reconciliations: reconciliations.map(rec => ({
                id: rec.id,
                reconciliationDate: rec.reconciliationDate,
                status: rec.status,
                statementPeriod: {
                    startDate: rec.bankStatement.statementStartDate,
                    endDate: rec.bankStatement.statementEndDate,
                },
                openingBalance: rec.bankStatement.openingBalance.toString(),
                closingBalance: rec.bankStatement.closingBalance.toString(),
                matchedTransactions: rec.matches.length,
                notes: rec.notes,
            })),
        };
    }

    private async calculateAccountBalance(ledgerEntries: any[]): Promise<Decimal> {
        let balance = new Decimal(0);

        for (const entry of ledgerEntries) {
            if (entry.transactionType === 'DEBIT') {
                balance = balance.plus(entry.amount);
            } else {
                balance = balance.minus(entry.amount);
            }
        }

        return balance;
    }

    async getEntitySummaryReport(entityId: string) {
        const entity = await this.prisma.entity.findUnique({
            where: { id: entityId },
            include: {
                properties: {
                    include: {
                        spaces: true,
                        leases: {
                            where: { status: 'ACTIVE' },
                        },
                    },
                },
                bankLedgers: true,
                _count: {
                    select: {
                        properties: true,
                        chartAccounts: true,
                        ledgerEntries: true,
                    },
                },
            },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        const totalSpaces = entity.properties.reduce((sum, prop) => sum + prop.spaces.length, 0);
        const occupiedSpaces = entity.properties.reduce((sum, prop) =>
            sum + prop.spaces.filter(space => space.status === 'OCCUPIED').length, 0);
        const totalRent = entity.properties.reduce((sum, prop) =>
            sum + prop.leases.reduce((leaseSum, lease) => leaseSum + lease.monthlyRent.toNumber(), 0), 0);
        const totalBankBalance = entity.bankLedgers.reduce((sum, bank) =>
            sum + bank.currentBalance.toNumber(), 0);

        return {
            entity: {
                id: entity.id,
                name: entity.name,
                legalName: entity.legalName,
                entityType: entity.entityType,
                isActive: entity.isActive,
                isVerified: entity.isVerified,
            },
            summary: {
                totalProperties: entity._count.properties,
                totalSpaces,
                occupiedSpaces,
                occupancyRate: totalSpaces > 0 ? ((occupiedSpaces / totalSpaces) * 100).toFixed(1) : '0',
                monthlyRentRoll: totalRent.toFixed(2),
                totalBankBalance: totalBankBalance.toFixed(2),
                bankAccounts: entity.bankLedgers.length,
                chartAccounts: entity._count.chartAccounts,
                totalTransactions: entity._count.ledgerEntries,
            },
            properties: entity.properties.map(prop => ({
                id: prop.id,
                name: prop.name,
                address: `${prop.address}, ${prop.city}, ${prop.state} ${prop.zipCode}`,
                propertyType: prop.propertyType,
                totalSpaces: prop.spaces.length,
                occupiedSpaces: prop.spaces.filter(s => s.status === 'OCCUPIED').length,
                monthlyRent: prop.leases.reduce((sum, lease) => sum + lease.monthlyRent.toNumber(), 0),
            })),
            bankAccounts: entity.bankLedgers.map(bank => ({
                id: bank.id,
                accountName: bank.accountName,
                bankName: bank.bankName,
                accountType: bank.accountType,
                currentBalance: bank.currentBalance.toString(),
                isActive: bank.isActive,
            })),
        };
    }
}