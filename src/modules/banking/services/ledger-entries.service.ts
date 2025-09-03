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

    // CORE METHOD: Create multiple entries with proper validation and foreign key handling
    async createMultipleEntries(entityId: string, dto: CreateMultipleLedgerEntriesDto, userId: string) {
        console.log('🔍 Creating multiple ledger entries for entityId:', entityId);
        console.log('📝 DTO entries:', JSON.stringify(dto.entries, null, 2));

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
                console.log(`🏦 Processing entry for bankLedgerId: ${entryDto.bankLedgerId}, chartAccountId: ${entryDto.chartAccountId}`);

                // CRITICAL: Validate ALL foreign key references exist and belong to the entity
                const [bankLedger, chartAccount, userExists] = await Promise.all([
                    // Verify bank ledger exists and belongs to entity
                    prisma.bankLedger.findFirst({
                        where: {
                            id: entryDto.bankLedgerId,
                            entityId: entityId // CRITICAL: Entity validation
                        },
                    }),
                    // Verify chart account exists and belongs to entity  
                    prisma.chartAccount.findFirst({
                        where: {
                            id: entryDto.chartAccountId,
                            entityId: entityId // CRITICAL: Entity validation
                        },
                    }),
                    // Verify user exists (for createdById foreign key)
                    prisma.user.findUnique({
                        where: { id: userId }
                    })
                ]);

                // THROW specific errors for missing foreign keys
                if (!bankLedger) {
                    throw new NotFoundException(
                        `Bank ledger ${entryDto.bankLedgerId} not found for entity ${entityId}`
                    );
                }

                if (!chartAccount) {
                    throw new NotFoundException(
                        `Chart account ${entryDto.chartAccountId} not found for entity ${entityId}`
                    );
                }

                if (!userExists) {
                    throw new NotFoundException(`User ${userId} not found for createdById`);
                }

                console.log(`✅ Foreign key validation passed for entry`);

                const debitAmount = new Decimal(entryDto.debitAmount);
                const creditAmount = new Decimal(entryDto.creditAmount);

                // Create the ledger entry with ALL required fields
                const entry = await prisma.ledgerEntry.create({
                    data: {
                        // REQUIRED foreign keys
                        bankLedgerId: entryDto.bankLedgerId,
                        chartAccountId: entryDto.chartAccountId, // Fixed field name
                        createdById: userId,

                        // Entry details
                        entryType: entryDto.entryType || EntryType.MANUAL,
                        description: entryDto.description,
                        debitAmount: debitAmount,
                        creditAmount: creditAmount,
                        transactionDate: new Date(entryDto.transactionDate),

                        // Optional fields
                        referenceId: entryDto.referenceId || null,
                        referenceNumber: entryDto.referenceNumber || null,

                        // Legacy support - calculate for old transactionType field if it exists
                        transactionType: debitAmount.gt(0) ? 'DEBIT' : 'CREDIT',
                        amount: debitAmount.gt(0) ? debitAmount : creditAmount,
                    },
                    include: {
                        bankLedger: true,
                        chartAccount: true,
                        users: {
                            select: { id: true, email: true, firstName: true, lastName: true }
                        }
                    }
                });

                console.log(`✅ Created ledger entry: ${entry.id}`);
                createdEntries.push(entry);

                // Only update bank balance if this entry affects the bank's chart account
                if (entryDto.chartAccountId === bankLedger.chartAccountId) {
                    const balanceChange = debitAmount.minus(creditAmount);
                    await prisma.bankLedger.update({
                        where: { id: entryDto.bankLedgerId },
                        data: {
                            currentBalance: {
                                increment: balanceChange
                            }
                        }
                    });
                    console.log(`💰 Updated bank balance by: ${balanceChange}`);
                }
            }

            console.log(`🎉 Successfully created ${createdEntries.length} ledger entries`);
            return createdEntries;
        });
    }

    // SIMPLE ENTRY: Fixed foreign key validation
    async createSimpleEntry(entityId: string, dto: CreateSimpleEntryDto, userId: string) {
        console.log('📝 Creating simple entry for entityId:', entityId, 'DTO:', dto);

        const amount = new Decimal(dto.amount);

        // Validate both bank ledger and account belong to entity
        const [bankLedger, chartAccount] = await Promise.all([
            this.prisma.bankLedger.findFirst({
                where: { id: dto.bankAccountId, entityId }
            }),
            this.prisma.chartAccount.findFirst({
                where: { id: dto.accountId, entityId }
            })
        ]);

        if (!bankLedger) {
            throw new NotFoundException(`Bank account ${dto.bankAccountId} not found for entity ${entityId}`);
        }

        if (!chartAccount) {
            throw new NotFoundException(`Chart account ${dto.accountId} not found for entity ${entityId}`);
        }

        // Determine debit/credit based on transaction type
        let bankDebit = new Decimal(0);
        let bankCredit = new Decimal(0);
        let accountDebit = new Decimal(0);
        let accountCredit = new Decimal(0);

        switch (dto.transactionType) {
            case 'DEPOSIT':
            case 'PAYMENT':
                // Money coming in: Debit Bank (Asset), Credit Income
                bankDebit = amount;
                accountCredit = amount;
                break;
            case 'WITHDRAWAL':
                // Money going out: Credit Bank (Asset), Debit Expense
                bankCredit = amount;
                accountDebit = amount;
                break;
            case 'TRANSFER':
                // Handle transfer logic based on account types
                bankDebit = amount;
                accountCredit = amount;
                break;
            default:
                throw new BadRequestException(`Unsupported transaction type: ${dto.transactionType}`);
        }

        // Create the double entries
        const entries = [
            {
                bankLedgerId: dto.bankAccountId,
                chartAccountId: dto.bankAccountId, // Bank asset account
                entryType: EntryType.MANUAL,
                description: dto.description,
                debitAmount: bankDebit.toString(),
                creditAmount: bankCredit.toString(),
                transactionDate: dto.transactionDate,
                referenceNumber: dto.referenceNumber,
            },
            {
                bankLedgerId: dto.bankAccountId,
                chartAccountId: dto.accountId, // The other account
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

    // PAYMENT RECORDING: Fixed to handle foreign keys properly
    async recordPayment(entityId: string, dto: RecordPaymentDto, userId: string) {
        console.log('💳 Recording payment for entityId:', entityId, 'DTO:', dto);

        const amount = new Decimal(dto.amount);

        // VALIDATE all required entities exist BEFORE creating entries
        const [bankLedger, incomeAccount, userExists] = await Promise.all([
            this.prisma.bankLedger.findFirst({
                where: { id: dto.bankAccountId, entityId }
            }),
            this.prisma.chartAccount.findFirst({
                where: { id: dto.incomeAccountId, entityId }
            }),
            this.prisma.user.findUnique({
                where: { id: userId }
            })
        ]);

        if (!bankLedger) {
            throw new NotFoundException(`Bank account ${dto.bankAccountId} not found for entity ${entityId}`);
        }

        if (!incomeAccount) {
            throw new NotFoundException(`Income account ${dto.incomeAccountId} not found for entity ${entityId}`);
        }

        if (!userExists) {
            throw new NotFoundException(`User ${userId} not found`);
        }

        // Create double entry for payment received
        const entries = [
            {
                bankLedgerId: dto.bankAccountId,
                chartAccountId: dto.bankAccountId, // Bank asset account
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
                chartAccountId: dto.incomeAccountId, // Revenue account
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

    // CHECK DEPOSIT: Fixed validation
    async recordCheckDeposit(entityId: string, dto: RecordCheckDepositDto, userId: string) {
        console.log('🏦 Recording check deposit for entityId:', entityId);

        const totalAmount = dto.checks.reduce(
            (sum, check) => sum.plus(new Decimal(check.amount)),
            new Decimal(0)
        );

        // Validate bank account exists for entity
        const bankLedger = await this.prisma.bankLedger.findFirst({
            where: { id: dto.bankAccountId, entityId }
        });

        if (!bankLedger) {
            throw new NotFoundException(`Bank account ${dto.bankAccountId} not found for entity ${entityId}`);
        }

        // Validate all income accounts exist for entity
        const incomeAccountIds = dto.checks.map(check => check.incomeAccountId);
        const incomeAccounts = await this.prisma.chartAccount.findMany({
            where: {
                id: { in: incomeAccountIds },
                entityId
            }
        });

        if (incomeAccounts.length !== incomeAccountIds.length) {
            const foundIds = incomeAccounts.map(acc => acc.id);
            const missingIds = incomeAccountIds.filter(id => !foundIds.includes(id));
            throw new NotFoundException(`Income accounts not found for entity: ${missingIds.join(', ')}`);
        }

        const entries: any[] = [];

        // Single debit to bank account for total deposit
        entries.push({
            bankLedgerId: dto.bankAccountId,
            chartAccountId: dto.bankAccountId, // Bank asset account
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

    // GET LEDGER ENTRIES with proper filtering
    async getLedgerEntries(
        entityId: string,
        bankLedgerId?: string,
        chartAccountId?: string,
        limit: number = 50,
        offset: number = 0,
    ) {
        console.log(`📊 Getting ledger entries for entity: ${entityId}`);

        const where: any = {
            bankLedger: {
                entityId: entityId // CRITICAL: Only get entries for this entity
            }
        };

        if (bankLedgerId) {
            where.bankLedgerId = bankLedgerId;
        }

        if (chartAccountId) {
            where.chartAccountId = chartAccountId;
        }

        const [entries, total] = await Promise.all([
            this.prisma.ledgerEntry.findMany({
                where,
                include: {
                    bankLedger: {
                        select: {
                            id: true,
                            accountName: true,
                            bankName: true,
                        }
                    },
                    chartAccount: {
                        select: {
                            id: true,
                            accountName: true,
                            accountCode: true,
                            accountType: true,
                        }
                    },
                    users: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        }
                    }
                },
                orderBy: [
                    { transactionDate: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: limit,
                skip: offset,
            }),
            this.prisma.ledgerEntry.count({ where })
        ]);

        console.log(`📊 Found ${entries.length} ledger entries (${total} total)`);

        return {
            entries,
            total,
            hasMore: offset + entries.length < total,
            pagination: {
                limit,
                offset,
                total
            }
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

    // /**
    //  * Delete a single ledger entry
    //  */
    // async delete(entityId: string, entryId: string, userId: string) {
    //     console.log(`Attempting to delete ledger entry ${entryId} for entity ${entityId}`);

    //     // Find entry with bankLedger relationship to verify entity ownership
    //     const existingEntry = await this.prisma.ledgerEntry.findFirst({
    //         where: {
    //             id: entryId,
    //         },
    //         include: {
    //             bankLedger: {
    //                 select: {
    //                     id: true,
    //                     entityId: true
    //                 }
    //             }
    //         }
    //     });

    //     console.log(`Found entry:`, existingEntry);

    //     if (!existingEntry) {
    //         throw new Error(`Ledger entry with ID ${entryId} not found`);
    //     }

    //     // Check if the entry belongs to the correct entity through bankLedger relationship
    //     if (existingEntry.bankLedger.entityId !== entityId) {
    //         throw new Error(`Ledger entry ${entryId} belongs to entity ${existingEntry.bankLedger.entityId}, not ${entityId}`);
    //     }

    //     // Delete the entry
    //     await this.prisma.ledgerEntry.delete({
    //         where: {
    //             id: entryId
    //         }
    //     });

    //     console.log(`Successfully deleted ledger entry ${entryId}`);

    //     return {
    //         success: true,
    //         message: `Ledger entry deleted successfully`,
    //         deletedId: entryId
    //     };
    // }

    // DELETE ENTRY with proper validation
    async deleteEntry(entityId: string, entryId: string) {
        console.log(`🗑️ Deleting ledger entry: ${entryId} for entity: ${entityId}`);

        // Verify entry exists and belongs to entity
        const entry = await this.prisma.ledgerEntry.findFirst({
            where: {
                id: entryId,
                bankLedger: {
                    entityId: entityId
                }
            },
            include: {
                bankLedger: true
            }
        });

        if (!entry) {
            throw new NotFoundException(`Ledger entry ${entryId} not found for entity ${entityId}`);
        }

        // Delete in transaction and adjust bank balance
        return this.prisma.$transaction(async (prisma) => {
            // Reverse the balance change
            const balanceChange = entry.debitAmount.minus(entry.creditAmount);
            await prisma.bankLedger.update({
                where: { id: entry.bankLedgerId },
                data: {
                    currentBalance: {
                        decrement: balanceChange
                    }
                }
            });

            // Delete the entry
            const deletedEntry = await prisma.ledgerEntry.delete({
                where: { id: entryId }
            });

            console.log(`✅ Deleted ledger entry and adjusted bank balance by: -${balanceChange}`);
            return deletedEntry;
        });
    }

    // BULK DELETE for testing
    async deleteAllEntries(entityId: string) {
        console.log(`🗑️ BULK DELETE: Clearing all ledger entries for entity: ${entityId}`);

        return this.prisma.$transaction(async (prisma) => {
            // Get all entries for this entity
            const entries = await prisma.ledgerEntry.findMany({
                where: {
                    bankLedger: {
                        entityId: entityId
                    }
                },
                include: { bankLedger: true }
            });

            // Reset all bank balances to 0 for this entity
            await prisma.bankLedger.updateMany({
                where: { entityId },
                data: { currentBalance: 0 }
            });

            // Delete all entries for this entity
            const deleteResult = await prisma.ledgerEntry.deleteMany({
                where: {
                    bankLedger: {
                        entityId: entityId
                    }
                }
            });

            console.log(`✅ BULK DELETE: Removed ${deleteResult.count} entries and reset bank balances`);
            return deleteResult;
        });
    }
}