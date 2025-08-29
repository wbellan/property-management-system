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

        // Create the ledger entry using your actual schema fields
        const entry = await this.prisma.ledgerEntry.create({
            data: {
                bankLedgerId: dto.bankLedgerId,
                chartAccountId: dto.chartAccountId,
                transactionType: dto.debitAmount !== '0' ? 'DEBIT' : 'CREDIT', // Use existing field
                amount: debitAmount.gt(0) ? debitAmount : creditAmount, // Use existing field
                description: dto.description,
                transactionDate: new Date(dto.transactionDate),
                referenceNumber: dto.referenceNumber,
                createdById: userId,
            },
            include: {
                bankLedger: {
                    select: { accountName: true },
                },
                chartAccount: {
                    select: { accountCode: true, accountName: true },
                },
                users: {
                    select: { firstName: true, lastName: true },
                },
            },
        });

        // Update bank ledger balance
        const netAmount = debitAmount.minus(creditAmount);
        if (!netAmount.eq(0)) {
            await this.bankLedgerService.updateBalance(
                dto.bankLedgerId,
                netAmount.abs(),
                netAmount.gt(0) ? 'ADD' : 'SUBTRACT'
            );
        }

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

                // Create the entry using your actual schema
                const entry = await prisma.ledgerEntry.create({
                    data: {
                        bankLedgerId: entryDto.bankLedgerId,
                        chartAccountId: entryDto.chartAccountId,
                        transactionType: debitAmount.gt(0) ? 'DEBIT' : 'CREDIT',
                        amount: debitAmount.gt(0) ? debitAmount : creditAmount,
                        description: `${dto.transactionDescription} - ${entryDto.description}`,
                        transactionDate: new Date(entryDto.transactionDate),
                        referenceNumber: entryDto.referenceNumber,
                        createdById: userId,
                    },
                    include: {
                        bankLedger: { select: { accountName: true } },
                        chartAccount: { select: { accountCode: true, accountName: true } },
                    },
                });

                createdEntries.push(entry);

                // Update bank balance for this entry
                const netAmount = debitAmount.minus(creditAmount);
                if (!netAmount.eq(0)) {
                    await prisma.bankLedger.update({
                        where: { id: entryDto.bankLedgerId },
                        data: {
                            currentBalance: {
                                [netAmount.gt(0) ? 'increment' : 'decrement']: netAmount.abs(),
                            },
                        },
                    });
                }
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
        limit = 50,
        offset = 0
    ) {
        const where: any = {};

        if (bankLedgerId) where.bankLedgerId = bankLedgerId;
        if (chartAccountId) where.chartAccountId = chartAccountId;

        return this.prisma.ledgerEntry.findMany({
            where,
            include: {
                bankLedger: {
                    select: { accountName: true, bankName: true },
                },
                chartAccount: {
                    select: { accountCode: true, accountName: true },
                },
                users: {
                    select: { firstName: true, lastName: true },
                },
            },
            orderBy: {
                transactionDate: 'desc',
            },
            take: limit,
            skip: offset,
        });
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
}