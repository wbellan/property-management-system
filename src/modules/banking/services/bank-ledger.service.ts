import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBankLedgerDto, UpdateBankLedgerDto } from '../dto/create-bank-ledger.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BankLedgerService {
    constructor(private readonly prisma: PrismaService) { }

    async create(entityId: string, dto: CreateBankLedgerDto, userId: string) {
        // Verify entity exists
        const entity = await this.prisma.entity.findFirst({
            where: { id: entityId },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found or access denied');
        }

        // Check for duplicate account number within entity
        if (dto.accountNumber) {
            const existingAccount = await this.prisma.bankLedger.findFirst({
                where: {
                    entityId,
                    accountNumber: dto.accountNumber,
                    isActive: true,
                },
            });

            if (existingAccount) {
                throw new BadRequestException('Account number already exists for this entity');
            }
        }

        // NEW: Find or create corresponding chart account
        let chartAccount = await this.findOrCreateBankChartAccount(entityId, dto);

        return this.prisma.bankLedger.create({
            data: {
                entityId,
                accountName: dto.accountName,
                accountNumber: dto.accountNumber,
                bankName: dto.bankName,
                accountType: dto.accountType,
                routingNumber: dto.routingNumber,
                notes: dto.notes,
                currentBalance: new Decimal(0),
                isActive: true,
                chartAccountId: chartAccount.id, // NEW: Link to chart account
            },
            include: {
                entity: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                chartAccount: { // NEW: Include chart account info
                    select: {
                        id: true,
                        accountCode: true,
                        accountName: true,
                        accountType: true,
                    },
                },
            },
        });
    }

    async findAllByEntity(entityId: string, includeInactive = false) {
        const entity = await this.prisma.entity.findUnique({
            where: { id: entityId },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        return this.prisma.bankLedger.findMany({
            where: {
                entityId,
                ...(includeInactive ? {} : { isActive: true }),
            },
            include: {
                entity: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        ledgerEntries: true,
                    },
                },
            },
            orderBy: {
                accountName: 'asc',
            },
        });
    }

    async findOne(entityId: string, id: string) {
        const bankLedger = await this.prisma.bankLedger.findFirst({
            where: {
                id,
                entityId,
            },
            include: {
                entity: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                ledgerEntries: {
                    take: 10,
                    orderBy: {
                        transactionDate: 'desc',
                    },
                    include: {
                        chartAccount: {
                            select: {
                                accountCode: true,
                                accountName: true,
                            },
                        },
                    },
                },
            },
        });

        if (!bankLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        return bankLedger;
    }

    async update(entityId: string, id: string, dto: UpdateBankLedgerDto) {
        const existingLedger = await this.prisma.bankLedger.findFirst({
            where: {
                id,
                entityId,
            },
        });

        if (!existingLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        // Check for duplicate account number if updating
        if (dto.accountNumber && dto.accountNumber !== existingLedger.accountNumber) {
            const duplicateAccount = await this.prisma.bankLedger.findFirst({
                where: {
                    entityId,
                    accountNumber: dto.accountNumber,
                    id: { not: id },
                    isActive: true,
                },
            });

            if (duplicateAccount) {
                throw new BadRequestException('Account number already exists for this entity');
            }
        }

        return this.prisma.bankLedger.update({
            where: { id },
            data: {
                ...dto,
                updatedAt: new Date(),
            },
            include: {
                entity: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    async deactivate(entityId: string, id: string) {
        const bankLedger = await this.prisma.bankLedger.findFirst({
            where: {
                id,
                entityId,
            },
        });

        if (!bankLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        return this.prisma.bankLedger.update({
            where: { id },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
    }

    async getCurrentBalance(entityId: string, bankLedgerId: string): Promise<Decimal> {
        const bankLedger = await this.prisma.bankLedger.findFirst({
            where: {
                id: bankLedgerId,
                entityId,
            },
        });

        if (!bankLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        return bankLedger.currentBalance;
    }

    async updateBalance(bankLedgerId: string, amount: Decimal, operation: 'ADD' | 'SUBTRACT') {
        const currentLedger = await this.prisma.bankLedger.findUnique({
            where: { id: bankLedgerId },
        });

        if (!currentLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        const newBalance = operation === 'ADD'
            ? currentLedger.currentBalance.plus(amount)
            : currentLedger.currentBalance.minus(amount);

        return this.prisma.bankLedger.update({
            where: { id: bankLedgerId },
            data: {
                currentBalance: newBalance,
                updatedAt: new Date(),
            },
        });
    }

    async recalculateBalance(entityId: string, bankLedgerId: string) {
        const bankLedger = await this.prisma.bankLedger.findFirst({
            where: {
                id: bankLedgerId,
                entityId,
            },
        });

        if (!bankLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        // We'll implement this once ledger entries are working
        return bankLedger.currentBalance;
    }

    // NEW METHOD: Find or create appropriate chart account for bank account
    private async findOrCreateBankChartAccount(entityId: string, dto: CreateBankLedgerDto) {
        // First, try to find an existing appropriate chart account
        let chartAccount = await this.prisma.chartAccount.findFirst({
            where: {
                entityId,
                accountType: 'ASSET',
                OR: [
                    { accountName: { contains: 'Operating', mode: 'insensitive' } },
                    { accountName: { contains: 'Cash', mode: 'insensitive' } },
                    { accountCode: '1100' }, // Primary checking account
                ],
            },
            orderBy: { accountCode: 'asc' },
        });

        // If no suitable chart account found, create one
        if (!chartAccount) {
            // Generate next available account code in 11xx range
            const existingAccounts = await this.prisma.chartAccount.findMany({
                where: {
                    entityId,
                    accountCode: { startsWith: '11' },
                },
                orderBy: { accountCode: 'desc' },
                take: 1,
            });

            const nextCode = existingAccounts.length > 0
                ? (parseInt(existingAccounts[0].accountCode) + 10).toString()
                : '1100';

            chartAccount = await this.prisma.chartAccount.create({
                data: {
                    entityId,
                    accountCode: nextCode,
                    accountName: `Cash - ${dto.accountName}`,
                    accountType: 'ASSET',
                    description: `Asset account for bank account: ${dto.accountName} at ${dto.bankName}`,
                    isActive: true,
                },
            });
        }

        return chartAccount;
    }

    async getBankTransactions(
        entityId: string,
        accountId: string,
        options: {
            startDate?: Date;
            endDate?: Date;
            limit?: number;
            offset?: number;
        }
    ) {
        // Verify the bank account exists and belongs to the entity
        const bankAccount = await this.prisma.bankLedger.findFirst({
            where: {
                id: accountId,
                entityId: entityId,
            },
        });

        if (!bankAccount) {
            throw new NotFoundException('Bank account not found');
        }

        // Build date filter conditions
        const dateFilter: any = {};
        if (options.startDate) {
            dateFilter.gte = options.startDate;
        }
        if (options.endDate) {
            dateFilter.lte = options.endDate;
        }

        // Get bank transactions through bank statements
        const bankTransactions = await this.prisma.bankTransaction.findMany({
            where: {
                bankStatement: {
                    bankAccountId: accountId,
                },
                ...(Object.keys(dateFilter).length > 0 && {
                    transactionDate: dateFilter,
                }),
            },
            include: {
                bankStatement: {
                    select: {
                        bankAccountId: true,
                        statementReference: true,
                    },
                },
            },
            orderBy: {
                transactionDate: 'desc',
            },
            take: options.limit || 100,
            skip: options.offset || 0,
        });

        // Get total count for pagination
        const totalCount = await this.prisma.bankTransaction.count({
            where: {
                bankStatement: {
                    bankAccountId: accountId,
                },
                ...(Object.keys(dateFilter).length > 0 && {
                    transactionDate: dateFilter,
                }),
            },
        });

        // Format response data to match what your frontend expects
        const formattedTransactions = bankTransactions.map(transaction => ({
            id: transaction.id,
            date: transaction.transactionDate.toISOString(),
            amount: parseFloat(transaction.amount.toString()),
            description: transaction.description,
            referenceNumber: transaction.referenceNumber,
            transactionType: transaction.transactionType,
            runningBalance: transaction.runningBalance ? parseFloat(transaction.runningBalance.toString()) : null,
            bankAccountId: accountId,
            statementReference: transaction.bankStatement.statementReference,
            createdAt: transaction.createdAt.toISOString(),
        }));

        const limit = options.limit || 100;
        const offset = options.offset || 0;

        return {
            data: formattedTransactions,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount,
            },
            meta: {
                bankAccountId: accountId,
                entityId,
                dateRange: {
                    start: options.startDate?.toISOString() || null,
                    end: options.endDate?.toISOString() || null,
                },
            },
            // Add these for compatibility with your controller
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(totalCount / limit),
        };
    }
}