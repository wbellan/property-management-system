import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AuditLogEntry {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    userName: string;
    timestamp: Date;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
}

export interface ComplianceReport {
    period: {
        startDate: string;
        endDate: string;
    };
    totalTransactions: number;
    reconciledTransactions: number;
    unreconciledTransactions: number;
    reconciliationRate: string;
    auditTrail: {
        totalEntries: number;
        userActions: {
            userId: string;
            userName: string;
            actionCount: number;
        }[];
    };
    dataIntegrity: {
        balanceSheetBalanced: boolean;
        trialBalanceBalanced: boolean;
        bankBalanceMatches: boolean;
    };
}

@Injectable()
export class AuditService {
    constructor(private readonly prisma: PrismaService) { }

    async createAuditLog(
        action: string,
        entityType: string,
        entityId: string,
        userId: string,
        changes?: any,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<void> {
        try {
            await this.prisma.settingsAudit.create({
                data: {
                    userId,
                    targetType: entityType,
                    targetId: entityId,
                    settingKey: 'BANKING_ACTION',
                    oldValue: changes?.oldValue ? JSON.stringify(changes.oldValue) : null,
                    newValue: changes?.newValue ? JSON.stringify(changes.newValue) : action,
                    action,
                    ipAddress,
                    userAgent,
                },
            });
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Don't throw - audit logging shouldn't break business operations
        }
    }

    async getAuditTrail(
        entityId?: string,
        startDate?: string,
        endDate?: string,
        limit = 100,
        offset = 0,
    ): Promise<AuditLogEntry[]> {
        const whereClause: any = {};

        if (entityId) {
            whereClause.targetId = entityId;
        }

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt.gte = new Date(startDate);
            if (endDate) whereClause.createdAt.lte = new Date(endDate);
        }

        const auditEntries = await this.prisma.settingsAudit.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: offset,
        });

        return auditEntries.map(entry => ({
            id: entry.id,
            action: entry.action,
            entityType: entry.targetType,
            entityId: entry.targetId,
            userId: entry.userId,
            userName: `${entry.user.firstName} ${entry.user.lastName}`,
            timestamp: entry.createdAt,
            changes: {
                oldValue: entry.oldValue ? JSON.parse(entry.oldValue) : null,
                newValue: entry.newValue ? JSON.parse(entry.newValue) : null,
            },
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
        }));
    }

    async generateComplianceReport(
        entityId: string,
        startDate: string,
        endDate: string,
    ): Promise<ComplianceReport> {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get transaction counts
        const totalTransactions = await this.prisma.ledgerEntry.count({
            where: {
                entityId,
                transactionDate: { gte: start, lte: end },
            },
        });

        const reconciledTransactions = await this.prisma.ledgerEntry.count({
            where: {
                entityId,
                transactionDate: { gte: start, lte: end },
                reconciled: true,
            },
        });

        const unreconciledTransactions = totalTransactions - reconciledTransactions;
        const reconciliationRate = totalTransactions > 0
            ? ((reconciledTransactions / totalTransactions) * 100).toFixed(1)
            : '0';

        // Get audit trail summary
        const auditEntries = await this.prisma.settingsAudit.findMany({
            where: {
                targetId: entityId,
                createdAt: { gte: start, lte: end },
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        const userActionCounts = auditEntries.reduce((acc, entry) => {
            const key = entry.userId;
            if (!acc[key]) {
                acc[key] = {
                    userId: entry.userId,
                    userName: `${entry.user.firstName} ${entry.user.lastName}`,
                    actionCount: 0,
                };
            }
            acc[key].actionCount++;
            return acc;
        }, {} as Record<string, any>);

        // Check data integrity
        const dataIntegrity = await this.checkDataIntegrity(entityId);

        return {
            period: { startDate, endDate },
            totalTransactions,
            reconciledTransactions,
            unreconciledTransactions,
            reconciliationRate,
            auditTrail: {
                totalEntries: auditEntries.length,
                userActions: Object.values(userActionCounts),
            },
            dataIntegrity,
        };
    }

    private async checkDataIntegrity(entityId: string) {
        // Check if trial balance is balanced
        const accounts = await this.prisma.chartAccount.findMany({
            where: { entityId, isActive: true },
            include: { ledgerEntries: true },
        });

        let totalDebits = 0;
        let totalCredits = 0;

        for (const account of accounts) {
            for (const entry of account.ledgerEntries) {
                if (entry.transactionType === 'DEBIT') {
                    totalDebits += entry.amount.toNumber();
                } else {
                    totalCredits += entry.amount.toNumber();
                }
            }
        }

        const trialBalanceBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

        // Check balance sheet equation (Assets = Liabilities + Equity)
        let assets = 0;
        let liabilities = 0;
        let equity = 0;

        for (const account of accounts) {
            const balance = account.ledgerEntries.reduce((sum, entry) => {
                return entry.transactionType === 'DEBIT'
                    ? sum + entry.amount.toNumber()
                    : sum - entry.amount.toNumber();
            }, 0);

            switch (account.accountType) {
                case 'ASSET':
                    assets += balance;
                    break;
                case 'LIABILITY':
                    liabilities += balance;
                    break;
                case 'EQUITY':
                    equity += balance;
                    break;
            }
        }

        const balanceSheetBalanced = Math.abs(assets - (liabilities + equity)) < 0.01;

        // Check if calculated bank balances match recorded balances
        const bankAccounts = await this.prisma.bankLedger.findMany({
            where: { entityId },
            include: { ledgerEntries: true },
        });

        let bankBalanceMatches = true;
        for (const bankAccount of bankAccounts) {
            const calculatedBalance = bankAccount.ledgerEntries.reduce((sum, entry) => {
                return entry.transactionType === 'DEBIT'
                    ? sum + entry.amount.toNumber()
                    : sum - entry.amount.toNumber();
            }, 0);

            if (Math.abs(calculatedBalance - bankAccount.currentBalance.toNumber()) > 0.01) {
                bankBalanceMatches = false;
                break;
            }
        }

        return {
            balanceSheetBalanced,
            trialBalanceBalanced,
            bankBalanceMatches,
        };
    }

    async getBankingActivitySummary(entityId: string, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const recentTransactions = await this.prisma.ledgerEntry.count({
            where: {
                entityId,
                createdAt: { gte: startDate },
            },
        });

        const recentReconciliations = await this.prisma.bankReconciliation.count({
            where: {
                bankAccount: { entityId },
                createdAt: { gte: startDate },
            },
        });

        const pendingReconciliations = await this.prisma.bankReconciliation.count({
            where: {
                bankAccount: { entityId },
                status: 'IN_PROGRESS',
            },
        });

        const unreconciledTransactions = await this.prisma.ledgerEntry.count({
            where: {
                entityId,
                reconciled: false,
            },
        });

        return {
            period: `Last ${days} days`,
            recentTransactions,
            recentReconciliations,
            pendingReconciliations,
            unreconciledTransactions,
            dataIntegrityLastCheck: new Date().toISOString(),
        };
    }

    async exportAuditTrail(
        entityId?: string,
        startDate?: string,
        endDate?: string,
        format: 'JSON' | 'CSV' = 'JSON',
    ) {
        const auditEntries = await this.getAuditTrail(entityId, startDate, endDate, 1000);

        if (format === 'CSV') {
            const headers = [
                'Timestamp',
                'User',
                'Action',
                'Entity Type',
                'Entity ID',
                'IP Address',
                'Changes',
            ];

            const csvRows = auditEntries.map(entry => [
                entry.timestamp.toISOString(),
                entry.userName,
                entry.action,
                entry.entityType,
                entry.entityId,
                entry.ipAddress || '',
                JSON.stringify(entry.changes),
            ]);

            return {
                format: 'CSV',
                headers,
                data: csvRows,
            };
        }

        return {
            format: 'JSON',
            data: auditEntries,
        };
    }
}