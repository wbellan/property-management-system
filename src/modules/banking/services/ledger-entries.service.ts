import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    CreateLedgerEntryDto,
    CreateMultipleLedgerEntriesDto,
    CreateSimpleEntryDto,
    RecordPaymentDto,
    RecordCheckDepositDto
} from '../dto/create-ledger-entry.dto';
import { BankLedgerService } from './bank-ledger.service';
import { BalanceCalculatorService } from './balance-calculator.service';
import { Decimal } from '@prisma/client/runtime/library';
import { EntryType } from '@prisma/client';

@Injectable()
export class LedgerEntriesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly bankLedgerService: BankLedgerService,
        private readonly balanceCalculator: BalanceCalculatorService,
    ) { }

    async createEntry(entityId: string, dto: CreateLedgerEntryDto, userId: string) {
        console.log('Creating ledger entry:', dto);

        // Validate bank ledger belongs to entity
        const bankLedger = await this.prisma.bankLedger.findFirst({
            where: { id: dto.bankLedgerId, entityId },
        });

        if (!bankLedger) {
            throw new NotFoundException('Bank ledger not found');
        }

        // Validate chart account belongs to entity
        const chartAccount = await this.prisma.chartAccount.findFirst({
            where: { id: dto.chartAccountId, entityId },
        });

        if (!chartAccount) {
            throw new NotFoundException('Chart account not found');
        }

        const debitAmount = new Decimal(dto.debitAmount);
        const creditAmount = new Decimal(dto.creditAmount);

        // Validate that only one of debit or credit is non-zero
        if (debitAmount.gt(0) && creditAmount.gt(0)) {
            throw new BadRequestException('Entry cannot have both debit and credit amounts');
        }

        if (debitAmount.eq(0) && creditAmount.eq(0)) {
            throw new BadRequestException('Entry must have either debit or credit amount');
        }

        // Determine transaction type and main amount
        const transactionType = debitAmount.gt(0) ? 'DEBIT' : 'CREDIT';
        const mainAmount = debitAmount.gt(0) ? debitAmount : creditAmount;

        console.log('Creating entry with:', {
            transactionType,
            mainAmount: mainAmount.toString(),
            debitAmount: debitAmount.toString(),
            creditAmount: creditAmount.toString()
        });

        // Create the ledger entry with ALL fields properly populated
        const entry = await this.prisma.ledgerEntry.create({
            data: {
                bankLedgerId: dto.bankLedgerId,
                chartAccountId: dto.chartAccountId,
                transactionType: transactionType,
                amount: mainAmount, // Main amount field
                debitAmount: debitAmount, // Separate debit field
                creditAmount: creditAmount, // Separate credit field
                description: dto.description,
                transactionDate: new Date(dto.transactionDate),
                referenceNumber: dto.referenceNumber,
                referenceId: dto.referenceId,
                entryType: dto.entryType || 'MANUAL',
                createdById: userId,
            },
            include: {
                bankLedger: {
                    select: {
                        id: true,
                        accountName: true,
                        entityId: true
                    }
                },
                chartAccount: {
                    select: {
                        id: true,
                        accountCode: true,
                        accountName: true,
                        accountType: true
                    }
                },
            },
        });

        // Update bank balance
        const balanceChange = transactionType === 'DEBIT' ? mainAmount : mainAmount.neg();
        await this.prisma.bankLedger.update({
            where: { id: dto.bankLedgerId },
            data: {
                currentBalance: {
                    increment: balanceChange,
                },
            },
        });

        console.log('Created entry:', {
            id: entry.id,
            amount: entry.amount,
            debitAmount: entry.debitAmount,
            creditAmount: entry.creditAmount,
            transactionType: entry.transactionType
        });

        return entry;
    }

    async createMultipleEntries(entityId: string, dto: CreateMultipleLedgerEntriesDto, userId: string) {
        // Validate double-entry (total debits = total credits)
        const totalDebits = dto.entries.reduce(
            (sum, entry) => sum.plus(new Decimal(entry.debitAmount)),
            new Decimal(0)
        );

        const totalCredits = dto.entries.reduce(
            (sum, entry) => sum.plus(new Decimal(entry.creditAmount)),
            new Decimal(0)
        );

        if (!totalDebits.equals(totalCredits)) {
            throw new BadRequestException(
                `Total debits (${totalDebits}) must equal total credits (${totalCredits})`
            );
        }

        // Use transaction to ensure all entries are created atomically
        return this.prisma.$transaction(async (prisma) => {
            const createdEntries = [];

            for (const entryDto of dto.entries) {
                // Validate each entry belongs to the entity
                const [bankLedger, chartAccount] = await Promise.all([
                    prisma.bankLedger.findFirst({
                        where: { id: entryDto.bankLedgerId, entityId },
                    }),
                    prisma.chartAccount.findFirst({
                        where: { id: entryDto.chartAccountId, entityId },
                    }),
                ]);

                if (!bankLedger) {
                    throw new NotFoundException(`Bank ledger ${entryDto.bankLedgerId} not found`);
                }

                if (!chartAccount) {
                    throw new NotFoundException(`Chart account ${entryDto.chartAccountId} not found`);
                }

                const debitAmount = new Decimal(entryDto.debitAmount);
                const creditAmount = new Decimal(entryDto.creditAmount);

                // Determine transaction type and main amount
                const transactionType = debitAmount.gt(0) ? 'DEBIT' : 'CREDIT';
                const mainAmount = debitAmount.gt(0) ? debitAmount : creditAmount;

                // Create the entry with ALL fields populated correctly
                const entry = await prisma.ledgerEntry.create({
                    data: {
                        bankLedgerId: entryDto.bankLedgerId,
                        chartAccountId: entryDto.chartAccountId,
                        transactionType: transactionType,
                        amount: mainAmount, // Main amount
                        debitAmount: debitAmount, // Separate debit amount
                        creditAmount: creditAmount, // Separate credit amount
                        description: `${dto.transactionDescription} - ${entryDto.description}`,
                        transactionDate: new Date(entryDto.transactionDate),
                        referenceNumber: entryDto.referenceNumber,
                        referenceId: entryDto.referenceId,
                        entryType: entryDto.entryType || 'MANUAL',
                        createdById: userId,
                    },
                    include: {
                        bankLedger: { select: { id: true, accountName: true, entityId: true } },
                        chartAccount: { select: { id: true, accountCode: true, accountName: true, accountType: true } },
                    },
                });

                createdEntries.push(entry);

                // Update bank balance for this entry
                const balanceChange = transactionType === 'DEBIT' ? mainAmount : mainAmount.neg();
                await prisma.bankLedger.update({
                    where: { id: entryDto.bankLedgerId },
                    data: {
                        currentBalance: {
                            increment: balanceChange,
                        },
                    },
                });
            }

            return createdEntries;
        });
    }

    async createSimpleEntry(entityId: string, dto: CreateSimpleEntryDto, userId: string) {
        const amount = new Decimal(dto.amount);

        // Determine debit/credit based on transaction type
        let bankDebit = new Decimal(0);
        let bankCredit = new Decimal(0);
        let accountDebit = new Decimal(0);
        let accountCredit = new Decimal(0);

        switch (dto.transactionType) {
            case 'DEPOSIT':
                bankDebit = amount;
                accountCredit = amount;
                break;
            case 'WITHDRAWAL':
            case 'PAYMENT':
                bankCredit = amount;
                accountDebit = amount;
                break;
            case 'TRANSFER':
                throw new BadRequestException('Transfer transactions not yet implemented');
            default:
                throw new BadRequestException('Invalid transaction type');
        }

        // Create the double entries
        const entries = [
            {
                bankLedgerId: dto.bankAccountId,
                chartAccountId: dto.bankAccountId,
                entryType: EntryType.MANUAL,
                description: dto.description,
                debitAmount: bankDebit.toString(),
                creditAmount: bankCredit.toString(),
                transactionDate: dto.transactionDate,
                referenceNumber: dto.referenceNumber,
            },
            {
                bankLedgerId: dto.bankAccountId,
                chartAccountId: dto.accountId,
                entryType: EntryType.MANUAL,
                description: dto.description,
                debitAmount: accountDebit.toString(),
                creditAmount: accountCredit.toString(),
                transactionDate: dto.transactionDate,
                referenceNumber: dto.referenceNumber,
            },
        ];

        return this.createMultipleEntries(
            entityId,
            {
                entries,
                transactionDescription: `${dto.transactionType}: ${dto.description}`,
            },
            userId
        );
    }

    async recordPayment(entityId: string, dto: RecordPaymentDto, userId: string) {
        const amount = new Decimal(dto.amount);

        // Create double entry for payment received
        const entries = [
            {
                bankLedgerId: dto.bankAccountId,
                chartAccountId: dto.bankAccountId,
                entryType: EntryType.PAYMENT,
                description: `Payment received: ${dto.description}`,
                debitAmount: amount.toString(),
                creditAmount: '0',
                transactionDate: dto.paymentDate,
                referenceId: dto.referenceId,
                referenceNumber: dto.checkNumber || undefined,
            },
            {
                bankLedgerId: dto.bankAccountId,
                chartAccountId: dto.incomeAccountId,
                entryType: EntryType.PAYMENT,
                description: `Payment received: ${dto.description}`,
                debitAmount: '0',
                creditAmount: amount.toString(),
                transactionDate: dto.paymentDate,
                referenceId: dto.referenceId,
                referenceNumber: dto.checkNumber || undefined,
            },
        ];

        return this.createMultipleEntries(
            entityId,
            {
                entries,
                transactionDescription: `Payment Received - ${dto.paymentMethod}${dto.payerName ? ` from ${dto.payerName}` : ''}`,
            },
            userId
        );
    }

    async recordCheckDeposit(entityId: string, dto: RecordCheckDepositDto, userId: string) {
        const totalAmount = dto.checks.reduce(
            (sum, check) => sum.plus(new Decimal(check.amount)),
            new Decimal(0)
        );

        const entries: any[] = [];

        // Single debit to bank account for total deposit
        entries.push({
            bankLedgerId: dto.bankAccountId,
            chartAccountId: dto.bankAccountId,
            entryType: EntryType.DEPOSIT,
            description: `Check deposit - ${dto.checks.length} checks`,
            debitAmount: totalAmount.toString(),
            creditAmount: '0',
            transactionDate: dto.depositDate,
            referenceNumber: dto.depositSlipNumber,
        });

        // Credit to income accounts for each check
        dto.checks.forEach((check) => {
            entries.push({
                bankLedgerId: dto.bankAccountId,
                chartAccountId: check.incomeAccountId,
                entryType: EntryType.DEPOSIT,
                description: `Check #${check.checkNumber} - ${check.description}`,
                debitAmount: '0',
                creditAmount: check.amount,
                transactionDate: dto.depositDate,
                referenceId: check.referenceId,
                referenceNumber: check.checkNumber,
            });
        });

        return this.createMultipleEntries(
            entityId,
            {
                entries,
                transactionDescription: `Check Deposit - ${dto.checks.length} checks totaling $${totalAmount}`,
            },
            userId
        );
    }

    async getLedgerEntries(
        entityId: string,
        bankLedgerId?: string,
        chartAccountId?: string,
        limit: number = 50,
        offset: number = 0
    ) {
        console.log(`🔍 Getting ledger entries for entity: ${entityId}`);
        console.log(`   Filters - bankLedger: ${bankLedgerId}, chartAccount: ${chartAccountId}`);

        // Build proper WHERE clause that filters by entity through bankLedger relationship
        const whereClause: any = {
            bankLedger: {
                entityId: entityId  // This ensures we only get entries for this entity
            }
        };

        // Add optional filters
        if (bankLedgerId) {
            whereClause.bankLedgerId = bankLedgerId;
        }

        if (chartAccountId) {
            whereClause.chartAccountId = chartAccountId;
        }

        console.log(`🔍 Using WHERE clause:`, JSON.stringify(whereClause, null, 2));

        // Get total count with same filter
        const total = await this.prisma.ledgerEntry.count({
            where: whereClause
        });

        console.log(`📊 Found ${total} total entries for entity ${entityId}`);

        // Get entries with proper includes
        const entries = await this.prisma.ledgerEntry.findMany({
            where: whereClause,
            include: {
                bankLedger: {
                    select: {
                        id: true,
                        accountName: true,
                        entityId: true  // Include this to verify in logs
                    }
                },
                chartAccount: {
                    select: {
                        id: true,
                        accountCode: true,
                        accountName: true,
                        accountType: true
                    }
                }
            },
            orderBy: {
                transactionDate: 'desc'
            },
            take: limit,
            skip: offset
        });

        console.log(`✅ Retrieved ${entries.length} entries for entity ${entityId}`);

        // Debug: log first entry details
        if (entries.length > 0) {
            const first = entries[0];
            console.log(`🔍 First entry - ID: ${first.id}, BankLedger Entity: ${first.bankLedger.entityId}`);
        }

        return {
            entries,
            total,
            hasMore: offset + entries.length < total
        };
    }

    async validateDoubleEntry(entries: CreateLedgerEntryDto[]): Promise<{
        isValid: boolean;
        totalDebits: string;
        totalCredits: string;
        difference: string;
    }> {
        const totalDebits = entries.reduce(
            (sum, entry) => sum.plus(new Decimal(entry.debitAmount)),
            new Decimal(0)
        );

        const totalCredits = entries.reduce(
            (sum, entry) => sum.plus(new Decimal(entry.creditAmount)),
            new Decimal(0)
        );

        const difference = totalDebits.minus(totalCredits);

        return {
            isValid: difference.eq(0),
            totalDebits: totalDebits.toString(),
            totalCredits: totalCredits.toString(),
            difference: difference.toString(),
        };
    }

    /**
     * Find a specific ledger entry
     */
    async findOne(entityId: string, entryId: string) {
        const entry = await this.prisma.ledgerEntry.findFirst({
            where: {
                id: entryId,
                entityId: entityId
            },
            include: {
                bankLedger: {
                    select: {
                        id: true,
                        accountName: true
                    }
                },
                chartAccount: {
                    select: {
                        id: true,
                        accountCode: true,
                        accountName: true,
                        accountType: true
                    }
                }
            }
        });

        if (!entry) {
            throw new Error(`Ledger entry not found`);
        }

        return entry;
    }

    /**
     * Update a ledger entry
     */
    async update(entityId: string, entryId: string, updateData: any, userId: string) {
        // First verify the entry exists and belongs to the entity
        const existingEntry = await this.findOne(entityId, entryId);

        if (!existingEntry) {
            throw new Error(`Ledger entry not found`);
        }

        // Update the entry
        const updatedEntry = await this.prisma.ledgerEntry.update({
            where: {
                id: entryId
            },
            data: {
                ...updateData,
                updatedAt: new Date()
            },
            include: {
                bankLedger: {
                    select: {
                        id: true,
                        accountName: true
                    }
                },
                chartAccount: {
                    select: {
                        id: true,
                        accountCode: true,
                        accountName: true,
                        accountType: true
                    }
                }
            }
        });

        return updatedEntry;
    }

    /**
     * Delete a single ledger entry
     */
    async delete(entityId: string, entryId: string, userId: string) {
        console.log(`Attempting to delete ledger entry ${entryId} for entity ${entityId}`);

        // Find entry with bankLedger relationship to verify entity ownership
        const existingEntry = await this.prisma.ledgerEntry.findFirst({
            where: {
                id: entryId,
            },
            include: {
                bankLedger: {
                    select: {
                        id: true,
                        entityId: true
                    }
                }
            }
        });

        console.log(`Found entry:`, existingEntry);

        if (!existingEntry) {
            throw new Error(`Ledger entry with ID ${entryId} not found`);
        }

        // Check if the entry belongs to the correct entity through bankLedger relationship
        if (existingEntry.bankLedger.entityId !== entityId) {
            throw new Error(`Ledger entry ${entryId} belongs to entity ${existingEntry.bankLedger.entityId}, not ${entityId}`);
        }

        // Delete the entry
        await this.prisma.ledgerEntry.delete({
            where: {
                id: entryId
            }
        });

        console.log(`Successfully deleted ledger entry ${entryId}`);

        return {
            success: true,
            message: `Ledger entry deleted successfully`,
            deletedId: entryId
        };
    }

    /**
     * Delete all ledger entries for an entity
     */
    async deleteAll(entityId: string, userId: string) {
        // Count entries first
        const count = await this.prisma.ledgerEntry.count({
            where: {
                entityId: entityId
            }
        });

        if (count === 0) {
            return {
                success: true,
                message: 'No ledger entries to delete',
                deletedCount: 0
            };
        }

        // Delete all entries for the entity
        const result = await this.prisma.ledgerEntry.deleteMany({
            where: {
                entityId: entityId
            }
        });

        return {
            success: true,
            message: `Deleted ${result.count} ledger entries`,
            deletedCount: result.count
        };
    }
}