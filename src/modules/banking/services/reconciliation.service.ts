import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    ImportBankStatementDto,
    CreateReconciliationDto,
    CreateAdjustmentEntryDto,
    ReconciliationSummaryDto
} from '../dto/reconciliation.dto';
import { LedgerEntriesService } from './ledger-entries.service';
import { BankLedgerService } from './bank-ledger.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReconciliationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly ledgerEntriesService: LedgerEntriesService,
        private readonly bankLedgerService: BankLedgerService,
    ) { }

    async importBankStatement(entityId: string, dto: ImportBankStatementDto, userId: string) {
        // Verify bank account exists and belongs to entity
        const bankAccount = await this.prisma.bankLedger.findFirst({
            where: { id: dto.bankAccountId, entityId },
        });

        if (!bankAccount) {
            throw new NotFoundException('Bank account not found');
        }

        // Check for duplicate statement
        const existingStatement = await this.prisma.bankStatement.findFirst({
            where: {
                bankAccountId: dto.bankAccountId,
                statementStartDate: new Date(dto.statementStartDate),
                statementEndDate: new Date(dto.statementEndDate),
            },
        });

        if (existingStatement) {
            throw new BadRequestException('Bank statement for this period already exists');
        }

        return this.prisma.$transaction(async (prisma) => {
            // Create the bank statement record
            const statement = await prisma.bankStatement.create({
                data: {
                    bankAccountId: dto.bankAccountId,
                    statementStartDate: new Date(dto.statementStartDate),
                    statementEndDate: new Date(dto.statementEndDate),
                    openingBalance: new Decimal(dto.openingBalance),
                    closingBalance: new Decimal(dto.closingBalance),
                    statementReference: dto.statementReference,
                    importedById: userId,
                    importedAt: new Date(),
                },
            });

            // Create individual bank transactions
            const bankTransactions = [];
            for (const transaction of dto.transactions) {
                const bankTransaction = await prisma.bankTransaction.create({
                    data: {
                        bankStatementId: statement.id,
                        transactionDate: new Date(transaction.transactionDate),
                        amount: new Decimal(transaction.amount),
                        description: transaction.description,
                        referenceNumber: transaction.referenceNumber,
                        transactionType: transaction.transactionType || (new Decimal(transaction.amount).gt(0) ? 'CREDIT' : 'DEBIT'),
                        runningBalance: transaction.runningBalance ? new Decimal(transaction.runningBalance) : null,
                    },
                });
                bankTransactions.push(bankTransaction);
            }

            return {
                statement,
                transactions: bankTransactions,
                summary: {
                    totalTransactions: bankTransactions.length,
                    totalDeposits: bankTransactions
                        .filter(t => new Decimal(t.amount.toString()).gt(0))
                        .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))
                        .toString(),
                    totalWithdrawals: bankTransactions
                        .filter(t => new Decimal(t.amount.toString()).lt(0))
                        .reduce((sum, t) => sum.plus(t.amount.abs()), new Decimal(0))
                        .toString(),
                },
            };
        });
    }

    async getUnreconciledTransactions(entityId: string, bankAccountId: string) {
        // Get ledger entries that haven't been reconciled
        const unreconciledEntries = await this.prisma.ledgerEntry.findMany({
            where: {
                bankLedgerId: bankAccountId,
                reconciled: false,
            },
            include: {
                chartAccount: {
                    select: { accountCode: true, accountName: true },
                },
            },
            orderBy: {
                transactionDate: 'desc',
            },
        });

        // Get bank transactions that haven't been matched
        const unmatchedBankTransactions = await this.prisma.bankTransaction.findMany({
            where: {
                bankStatement: {
                    bankAccountId,
                },
                reconciliationMatch: null,
            },
            include: {
                bankStatement: {
                    select: { id: true, statementStartDate: true, statementEndDate: true },
                },
            },
            orderBy: {
                transactionDate: 'desc',
            },
        });

        return {
            unreconciledLedgerEntries: unreconciledEntries,
            unmatchedBankTransactions: unmatchedBankTransactions,
        };
    }

    async suggestMatches(entityId: string, bankAccountId: string) {
        const { unreconciledLedgerEntries, unmatchedBankTransactions } =
            await this.getUnreconciledTransactions(entityId, bankAccountId);

        const suggestions = [];

        for (const ledgerEntry of unreconciledLedgerEntries) {
            const potentialMatches = unmatchedBankTransactions.filter(bankTx => {
                const amountMatch = this.amountsMatch(ledgerEntry.amount, bankTx.amount);
                const dateMatch = this.datesMatch(ledgerEntry.transactionDate, bankTx.transactionDate);
                const descriptionMatch = this.descriptionsMatch(ledgerEntry.description, bankTx.description);

                return amountMatch && (dateMatch || descriptionMatch);
            });

            if (potentialMatches.length > 0) {
                suggestions.push({
                    ledgerEntry,
                    potentialMatches: potentialMatches.map(match => ({
                        ...match,
                        confidence: this.calculateMatchConfidence(ledgerEntry, match),
                    })),
                });
            }
        }

        return suggestions.sort((a, b) =>
            Math.max(...b.potentialMatches.map(m => m.confidence)) -
            Math.max(...a.potentialMatches.map(m => m.confidence))
        );
    }

    async createReconciliation(entityId: string, dto: CreateReconciliationDto, userId: string) {
        const bankAccount = await this.prisma.bankLedger.findFirst({
            where: { id: dto.bankAccountId, entityId },
        });

        if (!bankAccount) {
            throw new NotFoundException('Bank account not found');
        }

        const statement = await this.prisma.bankStatement.findUnique({
            where: { id: dto.bankStatementId },
        });

        if (!statement) {
            throw new NotFoundException('Bank statement not found');
        }

        return this.prisma.$transaction(async (prisma) => {
            // Create the reconciliation record
            const reconciliation = await prisma.bankReconciliation.create({
                data: {
                    bankAccountId: dto.bankAccountId,
                    bankStatementId: dto.bankStatementId,
                    reconciliationDate: new Date(dto.reconciliationDate),
                    reconciledById: userId,
                    notes: dto.notes,
                    status: 'IN_PROGRESS',
                },
            });

            // Create matches and update reconciliation status
            for (const match of dto.matches) {
                await prisma.reconciliationMatch.create({
                    data: {
                        reconciliationId: reconciliation.id,
                        ledgerEntryId: match.ledgerEntryId,
                        bankTransactionId: match.bankTransactionId,
                        matchNotes: match.matchNotes,
                    },
                });

                // Mark ledger entry as reconciled
                await prisma.ledgerEntry.update({
                    where: { id: match.ledgerEntryId },
                    data: {
                        reconciled: true,
                        reconciledAt: new Date(),
                    },
                });
            }

            // Update reconciliation status
            const summary = await this.getReconciliationSummary(entityId, dto.bankAccountId, dto.bankStatementId);
            const isComplete = summary.unreconciledTransactions === 0 &&
                Math.abs(parseFloat(summary.balanceDifference)) < 0.01;

            await prisma.bankReconciliation.update({
                where: { id: reconciliation.id },
                data: {
                    status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
                    completedAt: isComplete ? new Date() : null,
                },
            });

            return reconciliation;
        });
    }

    async createAdjustmentEntry(entityId: string, dto: CreateAdjustmentEntryDto, userId: string) {
        // Determine the appropriate chart account and entry type based on adjustment type
        let description = dto.description;
        let entryType = 'MANUAL';

        switch (dto.adjustmentType) {
            case 'BANK_FEE':
                description = `Bank Fee: ${dto.description}`;
                entryType = 'RECONCILIATION';
                break;
            case 'INTEREST':
                description = `Interest Income: ${dto.description}`;
                entryType = 'RECONCILIATION';
                break;
            case 'NSF_FEE':
                description = `NSF Fee: ${dto.description}`;
                entryType = 'RECONCILIATION';
                break;
            case 'CORRECTION':
                description = `Correction: ${dto.description}`;
                entryType = 'RECONCILIATION';
                break;
        }

        // Create ledger entry for the adjustment
        const adjustment = await this.ledgerEntriesService.createEntry(
            entityId,
            {
                bankLedgerId: dto.bankAccountId,
                chartAccountId: dto.chartAccountId,
                entryType: entryType as any,
                description,
                debitAmount: new Decimal(dto.amount).gt(0) ? dto.amount : '0',
                creditAmount: new Decimal(dto.amount).lt(0) ? Math.abs(parseFloat(dto.amount)).toString() : '0',
                transactionDate: dto.adjustmentDate,
                referenceId: dto.reconciliationId,
            },
            userId
        );

        return adjustment;
    }

    async getReconciliationSummary(
        entityId: string,
        bankAccountId: string,
        statementId?: string
    ): Promise<ReconciliationSummaryDto> {
        const bankAccount = await this.prisma.bankLedger.findFirst({
            where: { id: bankAccountId, entityId },
        });

        if (!bankAccount) {
            throw new NotFoundException('Bank account not found');
        }

        let statement = null;
        if (statementId) {
            statement = await this.prisma.bankStatement.findUnique({
                where: { id: statementId },
                include: {
                    _count: {
                        select: {
                            transactions: true,
                        },
                    },
                },
            });
        }

        // Get reconciled and unreconciled transactions
        const whereClause: any = { bankLedgerId: bankAccountId };
        if (statement) {
            whereClause.transactionDate = {
                gte: statement.statementStartDate,
                lte: statement.statementEndDate,
            };
        }

        const ledgerEntries = await this.prisma.ledgerEntry.findMany({
            where: whereClause,
        });

        const reconciledCount = ledgerEntries.filter(e => e.reconciled).length;
        const unreconciledCount = ledgerEntries.length - reconciledCount;

        const totalDeposits = ledgerEntries
            .filter(e => e.transactionType === 'DEBIT')
            .reduce((sum, e) => sum.plus(e.amount), new Decimal(0));

        const totalWithdrawals = ledgerEntries
            .filter(e => e.transactionType === 'CREDIT')
            .reduce((sum, e) => sum.plus(e.amount), new Decimal(0));

        const bookBalance = bankAccount.currentBalance;
        const statementBalance = statement ? statement.closingBalance : new Decimal(0);
        const balanceDifference = bookBalance.minus(statementBalance);

        return {
            bankAccountId,
            statementPeriod: statement ? {
                startDate: statement.statementStartDate.toISOString(),
                endDate: statement.statementEndDate.toISOString(),
            } : null,
            openingBalance: statement ? statement.openingBalance.toString() : '0',
            closingBalance: statement ? statement.closingBalance.toString() : '0',
            bookBalance: bookBalance.toString(),
            totalDeposits: totalDeposits.toString(),
            totalWithdrawals: totalWithdrawals.toString(),
            reconciledTransactions: reconciledCount,
            unreconciledTransactions: unreconciledCount,
            adjustments: ledgerEntries.filter(e => e.entryType === 'RECONCILIATION').length,
            balanceDifference: balanceDifference.toString(),
            isReconciled: Math.abs(balanceDifference.toNumber()) < 0.01 && unreconciledCount === 0,
        };
    }

    private amountsMatch(ledgerAmount: Decimal, bankAmount: Decimal): boolean {
        return ledgerAmount.abs().equals(bankAmount.abs());
    }

    private datesMatch(ledgerDate: Date, bankDate: Date, toleranceDays = 3): boolean {
        const diffMs = Math.abs(ledgerDate.getTime() - bankDate.getTime());
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= toleranceDays;
    }

    private descriptionsMatch(ledgerDesc: string, bankDesc: string): boolean {
        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedLedger = normalize(ledgerDesc);
        const normalizedBank = normalize(bankDesc);

        return normalizedLedger.includes(normalizedBank) ||
            normalizedBank.includes(normalizedLedger) ||
            this.calculateStringSimilarity(normalizedLedger, normalizedBank) > 0.6;
    }

    private calculateMatchConfidence(ledgerEntry: any, bankTransaction: any): number {
        let confidence = 0;

        // Amount match (40% weight)
        if (this.amountsMatch(ledgerEntry.amount, bankTransaction.amount)) {
            confidence += 0.4;
        }

        // Date match (30% weight)
        if (this.datesMatch(ledgerEntry.transactionDate, bankTransaction.transactionDate, 1)) {
            confidence += 0.3;
        } else if (this.datesMatch(ledgerEntry.transactionDate, bankTransaction.transactionDate, 3)) {
            confidence += 0.15;
        }

        // Description match (30% weight)
        const descriptionSimilarity = this.calculateStringSimilarity(
            ledgerEntry.description.toLowerCase(),
            bankTransaction.description.toLowerCase()
        );
        confidence += descriptionSimilarity * 0.3;

        return Math.min(confidence, 1.0);
    }

    private calculateStringSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        return (longer.length - this.levenshteinDistance(longer, shorter)) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }
}