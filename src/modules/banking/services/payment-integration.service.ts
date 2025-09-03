// src/modules/banking/services/payment-integration.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LedgerEntriesService } from './ledger-entries.service';
import {
    RecordPaymentDto,
    RecordCheckDepositDto,
    RecordPaymentBatchDto,
    GenerateReceiptDto,
    PaymentMethodType
} from '../dto/payment-integration.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentType, PaymentMethod, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentIntegrationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly ledgerService: LedgerEntriesService,
    ) { }

    /**
     * Record a payment and create corresponding ledger entries
     */
    async recordPayment(entityId: string, dto: RecordPaymentDto, userId: string) {
        console.log('🏦 Recording payment for entity:', entityId, dto);

        // Validate bank account belongs to entity and get its linked chart account
        const bankAccount = await this.prisma.bankLedger.findFirst({
            where: { id: dto.bankAccountId, entityId },
            include: {
                chartAccount: true, // NEW: Include the linked chart account
            },
        });

        if (!bankAccount) {
            throw new NotFoundException('Bank account not found');
        }

        if (!bankAccount.chartAccount) {
            throw new BadRequestException('Bank account is not linked to a chart account. Please contact system administrator.');
        }

        // Validate revenue account
        const revenueAccount = await this.prisma.chartAccount.findFirst({
            where: {
                id: dto.revenueAccountId,
                entityId,
                accountType: 'REVENUE'
            },
        });

        if (!revenueAccount) {
            throw new NotFoundException('Revenue account not found');
        }

        const amount = new Decimal(dto.amount);

        return this.prisma.$transaction(async (tx) => {
            let payment;

            // Payment record creation logic (unchanged)
            if (dto.paymentId) {
                payment = await tx.payment.findFirst({
                    where: {
                        id: dto.paymentId,
                        entityId: entityId
                    }
                });

                if (!payment) {
                    throw new NotFoundException('Payment not found');
                }

                await tx.payment.update({
                    where: { id: dto.paymentId },
                    data: {
                        status: 'COMPLETED',
                        processingStatus: 'CLEARED',
                        bankLedgerId: dto.bankAccountId,
                    }
                });
            } else {
                payment = await tx.payment.create({
                    data: {
                        entityId: entityId,
                        amount: amount,
                        paymentType: this.mapPaymentMethodToType(dto.paymentMethod),
                        paymentMethod: 'MANUAL',
                        status: 'COMPLETED',
                        processingStatus: 'CLEARED',
                        paymentDate: new Date(dto.paymentDate),
                        memo: dto.notes,
                        referenceNumber: dto.referenceNumber,
                        bankLedgerId: dto.bankAccountId,
                        payerName: dto.payerName,
                        paymentNumber: `PAY-${Date.now()}`,
                        receivedDate: new Date(dto.paymentDate),
                        isDeposited: true,
                        depositDate: new Date(dto.paymentDate),
                    }
                });
            }

            // Invoice application logic (unchanged)
            if (dto.invoiceId) {
                const invoice = await tx.invoice.findUnique({
                    where: { id: dto.invoiceId }
                });

                if (invoice) {
                    await tx.paymentApplication.create({
                        data: {
                            paymentId: payment.id,
                            invoiceId: dto.invoiceId,
                            appliedAmount: amount,
                            appliedDate: new Date(dto.paymentDate),
                            notes: `Applied payment to invoice ${invoice.invoiceNumber}`,
                        }
                    });
                }
            }

            // FIXED: Create ledger entries using the bank's linked chart account
            const ledgerEntries = await this.ledgerService.createMultipleEntries(
                entityId,
                {
                    transactionDescription: `Payment received - ${dto.paymentMethod}: ${dto.payerName}`,
                    entries: [
                        {
                            bankLedgerId: dto.bankAccountId,
                            chartAccountId: bankAccount.chartAccount.id, // Use the bank's linked chart account
                            entryType: 'PAYMENT',
                            description: `Payment deposit - ${dto.payerName}`,
                            debitAmount: amount.toString(),
                            creditAmount: '0',
                            transactionDate: dto.paymentDate,
                            referenceId: payment.id,
                            referenceNumber: dto.referenceNumber,
                        },
                        {
                            bankLedgerId: dto.bankAccountId,
                            chartAccountId: dto.revenueAccountId, // Use the selected revenue account
                            entryType: 'PAYMENT',
                            description: `Revenue from payment - ${dto.payerName}`,
                            debitAmount: '0',
                            creditAmount: amount.toString(),
                            transactionDate: dto.paymentDate,
                            referenceId: payment.id,
                            referenceNumber: dto.referenceNumber,
                        },
                    ],
                },
                userId
            );

            return {
                payment,
                ledgerEntries,
                bankBalance: await this.getBankAccountBalance(dto.bankAccountId),
                bankChartAccountUsed: bankAccount.chartAccount.id, // Return the correct chart account
                message: 'Payment recorded successfully with ledger entries created'
            };
        });
    }

    /**
     * Record a check deposit with multiple checks
     */
    async recordCheckDeposit(entityId: string, dto: RecordCheckDepositDto, userId: string) {
        console.log('💰 Recording check deposit for entity:', entityId);

        // Validate bank account
        const bankAccount = await this.prisma.bankLedger.findFirst({
            where: { id: dto.bankAccountId, entityId },
        });

        if (!bankAccount) {
            throw new NotFoundException('Bank account not found');
        }

        // Find or create the asset chart account for this bank (same logic as single payment)
        let bankChartAccount = await this.prisma.chartAccount.findFirst({
            where: {
                entityId,
                accountType: 'ASSET',
                accountName: { contains: bankAccount.accountName }
            }
        });

        if (!bankChartAccount) {
            bankChartAccount = await this.prisma.chartAccount.findFirst({
                where: {
                    entityId,
                    accountType: 'ASSET',
                    OR: [
                        { accountCode: '1100' },
                        { accountName: { contains: 'Checking' } },
                        { accountName: { contains: 'Cash' } },
                        { accountName: { contains: 'Bank' } }
                    ]
                }
            });
        }

        if (!bankChartAccount) {
            bankChartAccount = await this.prisma.chartAccount.create({
                data: {
                    entityId,
                    accountCode: '1100',
                    accountName: 'Cash - Checking Account',
                    accountType: 'ASSET',
                    description: 'Auto-created asset account for bank transactions',
                    isActive: true
                }
            });
        }

        // Validate total amount matches sum of checks
        const checksTotal = dto.checks.reduce((sum, check) =>
            sum.plus(new Decimal(check.amount)), new Decimal(0)
        );

        if (!checksTotal.equals(new Decimal(dto.totalAmount))) {
            throw new BadRequestException('Total amount does not match sum of individual checks');
        }

        return this.prisma.$transaction(async (tx) => {
            const createdPayments = [];
            const ledgerEntries = [];

            // Process each check
            for (const check of dto.checks) {
                // Validate revenue account for each check
                const revenueAccount = await tx.chartAccount.findFirst({
                    where: {
                        id: check.revenueAccountId,
                        entityId,
                        accountType: 'REVENUE'
                    },
                });

                if (!revenueAccount) {
                    throw new NotFoundException(`Revenue account not found for check ${check.checkNumber}`);
                }

                let payment;
                const checkAmount = new Decimal(check.amount);

                // Link to existing payment or create new one
                if (check.paymentId) {
                    payment = await tx.payment.update({
                        where: { id: check.paymentId },
                        data: {
                            status: 'COMPLETED',
                            processingStatus: 'CLEARED',
                            bankLedgerId: dto.bankAccountId,
                            isDeposited: true,
                            depositDate: new Date(dto.depositDate),
                        }
                    });
                } else {
                    payment = await tx.payment.create({
                        data: {
                            entityId: entityId,
                            amount: checkAmount,
                            paymentType: 'CHECK',
                            paymentMethod: 'MANUAL',
                            status: 'COMPLETED',
                            processingStatus: 'CLEARED',
                            paymentDate: new Date(dto.depositDate),
                            referenceNumber: check.checkNumber,
                            memo: `Check deposit - ${check.description}`,
                            bankLedgerId: dto.bankAccountId,
                            payerName: check.payerName,
                            paymentNumber: `CHK-${check.checkNumber}-${Date.now()}`,
                            receivedDate: new Date(dto.depositDate),
                            isDeposited: true,
                            depositDate: new Date(dto.depositDate),
                        }
                    });
                }

                // Create payment application if invoice provided
                if (check.invoiceId) {
                    await tx.paymentApplication.create({
                        data: {
                            paymentId: payment.id,
                            invoiceId: check.invoiceId,
                            appliedAmount: checkAmount,
                            appliedDate: new Date(dto.depositDate),
                            notes: `Applied check #${check.checkNumber} to invoice`,
                        }
                    });
                }

                createdPayments.push(payment);

                // Create ledger entries for this check using the correct chart account
                const checkLedgerEntries = await this.ledgerService.createMultipleEntries(
                    entityId,
                    {
                        transactionDescription: `Check deposit - Check #${check.checkNumber} from ${check.payerName}`,
                        entries: [
                            {
                                bankLedgerId: dto.bankAccountId,
                                chartAccountId: bankChartAccount.id, // Use asset chart account
                                entryType: 'DEPOSIT',
                                description: `Check #${check.checkNumber} - ${check.payerName}`,
                                debitAmount: checkAmount.toString(),
                                creditAmount: '0',
                                transactionDate: dto.depositDate,
                                referenceId: payment.id,
                                referenceNumber: check.checkNumber,
                            },
                            {
                                bankLedgerId: dto.bankAccountId,
                                chartAccountId: check.revenueAccountId, // Use revenue chart account
                                entryType: 'DEPOSIT',
                                description: `Revenue from Check #${check.checkNumber} - ${check.payerName}`,
                                debitAmount: '0',
                                creditAmount: checkAmount.toString(),
                                transactionDate: dto.depositDate,
                                referenceId: payment.id,
                                referenceNumber: check.checkNumber,
                            },
                        ],
                    },
                    userId
                );

                ledgerEntries.push(...checkLedgerEntries);
            }

            return {
                depositSummary: {
                    totalChecks: dto.checks.length,
                    totalAmount: dto.totalAmount,
                    depositDate: dto.depositDate,
                    depositSlipNumber: dto.depositSlipNumber
                },
                payments: createdPayments,
                ledgerEntries,
                bankBalance: await this.getBankAccountBalance(dto.bankAccountId),
                bankChartAccountUsed: bankChartAccount.id,
                message: `Check deposit recorded with ${dto.checks.length} checks`
            };
        });
    }

    /**
     * Get unreconciled payments for an entity
     */
    async getUnreconciledPayments(entityId: string, filters: any) {
        const whereClause: any = {
            entityId: entityId,
            // Since reconciledAt doesn't exist, we'll use processingStatus as proxy
            // Show all payments, or use a different filter
            // processingStatus: { not: 'CLEARED' }
        };

        if (filters.bankAccountId) {
            whereClause.bankLedgerId = filters.bankAccountId;
        }

        if (filters.dateFrom) {
            whereClause.paymentDate = {
                ...whereClause.paymentDate,
                gte: new Date(filters.dateFrom)
            };
        }

        if (filters.dateTo) {
            whereClause.paymentDate = {
                ...whereClause.paymentDate,
                lte: new Date(filters.dateTo)
            };
        }

        if (filters.paymentMethod) {
            whereClause.paymentType = filters.paymentMethod;
        }

        const payments = await this.prisma.payment.findMany({
            where: whereClause,
            include: {
                paymentApplications: {
                    include: {
                        invoice: {
                            select: {
                                id: true,
                                invoiceNumber: true,
                                customerName: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                paymentDate: 'desc'
            }
        });

        return {
            payments,
            count: payments.length,
            totalAmount: payments.reduce((sum, payment) =>
                sum.plus(new Decimal(payment.amount.toString())), new Decimal(0)
            ).toString()
        };
    }

    /**
     * Generate receipt for a payment
     */
    async generateReceipt(entityId: string, paymentId: string, dto: GenerateReceiptDto, userId: string) {
        const payment = await this.prisma.payment.findFirst({
            where: {
                id: paymentId,
                entityId: entityId
            },
            include: {
                entity: true,
                paymentApplications: {
                    include: {
                        invoice: {
                            include: {
                                lineItems: true
                            }
                        }
                    }
                }
            }
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        // Get the first invoice if any
        const firstApplication = payment.paymentApplications[0];
        const invoice = firstApplication?.invoice;

        // Basic receipt data structure
        const receiptData = {
            receiptNumber: `R-${payment.id.substring(0, 8).toUpperCase()}`,
            paymentId: payment.id,
            paymentDate: payment.paymentDate,
            amount: payment.amount.toString(),
            paymentMethod: payment.paymentType,
            referenceNumber: payment.referenceNumber,
            customer: {
                name: payment.payerName,
                email: payment.payerEmail
            },
            entity: payment.entity,
            invoice: dto.includeInvoiceDetails && invoice ? {
                number: invoice.invoiceNumber,
                items: invoice.lineItems
            } : null,
            generatedAt: new Date(),
            generatedBy: userId
        };

        // For now, we'll return the receipt data
        // In a full implementation, you'd create a PaymentReceipt record
        return {
            receipt: receiptData,
            message: 'Receipt generated successfully'
        };
    }

    /**
     * Get available payment methods
     */
    async getPaymentMethods(entityId: string) {
        return {
            methods: Object.values(PaymentMethodType).map(method => ({
                key: method,
                label: method.replace('_', ' '),
                enabled: true
            }))
        };
    }

    /**
     * Get revenue accounts for payment categorization
     */
    async getRevenueAccounts(entityId: string) {
        const accounts = await this.prisma.chartAccount.findMany({
            where: {
                entityId,
                accountType: 'REVENUE',
                isActive: true
            },
            orderBy: {
                accountCode: 'asc'
            }
        });

        return { accounts };
    }

    // Helper methods
    private async getBankAccountBalance(bankAccountId: string) {
        const account = await this.prisma.bankLedger.findUnique({
            where: { id: bankAccountId },
            select: { currentBalance: true }
        });

        return account?.currentBalance?.toString() || '0';
    }

    private mapPaymentMethodToType(method: PaymentMethodType): PaymentType {
        const mapping = {
            [PaymentMethodType.CHECK]: PaymentType.CHECK,
            [PaymentMethodType.CASH]: PaymentType.CASH,
            [PaymentMethodType.ACH]: PaymentType.ACH,
            [PaymentMethodType.WIRE]: PaymentType.WIRE_TRANSFER,
            [PaymentMethodType.CREDIT_CARD]: PaymentType.CREDIT_CARD,
            [PaymentMethodType.MONEY_ORDER]: PaymentType.MONEY_ORDER,
            [PaymentMethodType.BANK_TRANSFER]: PaymentType.BANK_TRANSFER
        };
        return mapping[method] || PaymentType.CHECK;
    }

    async reconcilePayment(entityId: string, paymentId: string, reconcileData: any, userId: string) {
        const payment = await this.prisma.payment.findFirst({
            where: {
                id: paymentId,
                entityId: entityId
            }
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        // Since reconciledAt doesn't exist, we'll update processingStatus
        const updatedPayment = await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                processingStatus: 'CLEARED',
                memo: reconcileData.notes || payment.memo
            }
        });

        return {
            payment: updatedPayment,
            message: 'Payment reconciled successfully'
        };
    }

    async recordPaymentBatch(entityId: string, dto: RecordPaymentBatchDto, userId: string) {
        // Implementation for batch payment processing
        console.log('Processing payment batch for entity:', entityId);

        return {
            message: 'Batch payment processing not yet implemented'
        };
    }
}