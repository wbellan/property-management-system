// src/financials/payment-application.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentStatus, InvoiceStatus, AccountType } from '@prisma/client';
import { CreatePaymentApplicationDto } from './dto';

// export interface CreatePaymentApplicationDto {
//     paymentId: string;
//     invoiceId: string;
//     appliedAmount: number;
//     notes?: string;
// }

@Injectable()
export class PaymentApplicationService {
    constructor(private prisma: PrismaService) { }

    async createApplication(dto: CreatePaymentApplicationDto, userId: string) {
        const { paymentId, invoiceId, appliedAmount, notes } = dto;

        return this.prisma.$transaction(async (prisma) => {
            // Validate payment exists and has sufficient unapplied balance
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    paymentApplications: {
                        select: { appliedAmount: true }
                    }
                }
            });

            if (!payment) {
                throw new NotFoundException('Payment not found');
            }

            // Validate invoice exists and is not fully paid
            const invoice = await prisma.invoice.findUnique({
                where: { id: invoiceId }
            });

            if (!invoice) {
                throw new NotFoundException('Invoice not found');
            }

            // Check entity match
            if (payment.entityId !== invoice.entityId) {
                throw new BadRequestException('Payment and invoice must belong to the same entity');
            }

            // Calculate available amounts
            const totalApplied = payment.paymentApplications.reduce(
                (sum, app) => sum + Number(app.appliedAmount), 0
            );
            const availablePaymentAmount = Number(payment.amount) - totalApplied;
            const invoiceBalance = Number(invoice.balanceAmount);

            // Validate application amount
            if (appliedAmount > availablePaymentAmount) {
                throw new BadRequestException(
                    `Applied amount ($${appliedAmount}) exceeds available payment balance ($${availablePaymentAmount})`
                );
            }

            if (appliedAmount > invoiceBalance) {
                throw new BadRequestException(
                    `Applied amount ($${appliedAmount}) exceeds invoice balance ($${invoiceBalance})`
                );
            }

            // Create payment application
            const application = await prisma.paymentApplication.create({
                data: {
                    paymentId,
                    invoiceId,
                    appliedAmount,
                    notes,
                    appliedDate: new Date(),
                }
            });

            // Update invoice amounts and status
            const newPaidAmount = Number(invoice.paidAmount) + appliedAmount;
            const newBalanceAmount = Number(invoice.totalAmount) - newPaidAmount;

            let newStatus = invoice.status;
            if (newBalanceAmount <= 0) {
                newStatus = InvoiceStatus.PAID; // Fixed: Use enum
            } else if (newPaidAmount > 0) {
                newStatus = InvoiceStatus.PARTIAL_PAYMENT; // Fixed: Use correct enum value
            }

            await prisma.invoice.update({
                where: { id: invoiceId },
                data: {
                    paidAmount: newPaidAmount,
                    balanceAmount: newBalanceAmount,
                    status: newStatus,
                }
            });

            // Update payment status if fully applied
            const newTotalApplied = totalApplied + appliedAmount;
            if (newTotalApplied >= Number(payment.amount)) {
                await prisma.payment.update({
                    where: { id: paymentId },
                    data: { status: PaymentStatus.COMPLETED }
                });
            }

            // Create GL entries for payment application
            await this.createPaymentApplicationGLEntries(application.id, userId);

            return this.findApplicationWithDetails(application.id);
        });
    }

    async removeApplication(applicationId: string, userId: string) {
        return this.prisma.$transaction(async (prisma) => {
            const application = await prisma.paymentApplication.findUnique({
                where: { id: applicationId },
                include: {
                    payment: true,
                    invoice: true
                }
            });

            if (!application) {
                throw new NotFoundException('Payment application not found');
            }

            // Remove the application
            await prisma.paymentApplication.delete({
                where: { id: applicationId }
            });

            // Update invoice amounts and status
            const invoice = application.invoice;
            const newPaidAmount = Number(invoice.paidAmount) - Number(application.appliedAmount);
            const newBalanceAmount = Number(invoice.totalAmount) - newPaidAmount;

            let newStatus = invoice.status;
            if (newPaidAmount <= 0) {
                newStatus = InvoiceStatus.SENT; // Fixed: Use enum
            } else if (newBalanceAmount > 0) {
                newStatus = InvoiceStatus.PARTIAL_PAYMENT; // Fixed: Use correct enum value
            }

            await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    paidAmount: newPaidAmount,
                    balanceAmount: newBalanceAmount,
                    status: newStatus,
                }
            });

            // Update payment status
            const payment = application.payment;
            const remainingApplications = await prisma.paymentApplication.findMany({
                where: { paymentId: payment.id }
            });

            const totalApplied = remainingApplications.reduce(
                (sum, app) => sum + Number(app.appliedAmount), 0
            );

            if (totalApplied < Number(payment.amount)) {
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: { status: PaymentStatus.PENDING }
                });
            }

            // Create reversing GL entries
            await this.reversePaymentApplicationGLEntries(applicationId, userId);

            return { message: 'Payment application removed successfully' };
        });
    }

    async findApplicationsByPayment(paymentId: string) {
        return this.prisma.paymentApplication.findMany({
            where: { paymentId },
            include: {
                invoice: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        totalAmount: true,
                        balanceAmount: true,
                        dueDate: true,
                        status: true
                    }
                }
            },
            orderBy: { appliedDate: 'desc' }
        });
    }

    async findApplicationsByInvoice(invoiceId: string) {
        return this.prisma.paymentApplication.findMany({
            where: { invoiceId },
            include: {
                payment: {
                    select: {
                        id: true,
                        paymentNumber: true,
                        amount: true,
                        paymentDate: true,
                        payerName: true,
                        paymentMethod: true,
                        status: true
                    }
                }
            },
            orderBy: { appliedDate: 'desc' }
        });
    }

    async getUnappliedPayments(entityId: string) {
        const payments = await this.prisma.payment.findMany({
            where: {
                entityId,
                status: { in: [PaymentStatus.PENDING, PaymentStatus.COMPLETED] } // Fixed: Use enum
            },
            include: {
                paymentApplications: {
                    select: { appliedAmount: true }
                }
            },
            orderBy: { paymentDate: 'desc' }
        });

        // Filter payments with available balance
        return payments.filter(payment => {
            const totalApplied = payment.paymentApplications.reduce(
                (sum, app) => sum + Number(app.appliedAmount), 0
            );
            const availableAmount = Number(payment.amount) - totalApplied;
            return availableAmount > 0;
        }).map(payment => {
            const totalApplied = payment.paymentApplications.reduce(
                (sum, app) => sum + Number(app.appliedAmount), 0
            );
            return {
                ...payment,
                availableAmount: Number(payment.amount) - totalApplied,
                appliedAmount: totalApplied
            };
        });
    }

    async getOutstandingInvoices(entityId: string) {
        return this.prisma.invoice.findMany({
            where: {
                entityId,
                status: { 
                    in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL_PAYMENT, InvoiceStatus.OVERDUE] // Fixed: Use enums
                },
                balanceAmount: { gt: 0 }
            },
            select: {
                id: true,
                invoiceNumber: true,
                tenantId: true,
                customerName: true, // Fixed: was billToName
                totalAmount: true,
                paidAmount: true,
                balanceAmount: true,
                dueDate: true,
                status: true,
                property: {
                    select: { id: true, name: true }
                },
                space: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { dueDate: 'asc' }
        });
    }

    private async findApplicationWithDetails(applicationId: string) {
        return this.prisma.paymentApplication.findUnique({
            where: { id: applicationId },
            include: {
                payment: {
                    select: {
                        id: true,
                        paymentNumber: true,
                        amount: true,
                        paymentDate: true,
                        payerName: true,
                        paymentMethod: true
                    }
                },
                invoice: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        totalAmount: true,
                        balanceAmount: true,
                        dueDate: true
                    }
                }
            }
        });
    }

    private async createPaymentApplicationGLEntries(applicationId: string, userId: string) {
        // Placeholder for GL entries until proper ledger system is implemented
        console.log(`GL entries would be created for payment application ${applicationId} by user ${userId}`);
    }

    private async reversePaymentApplicationGLEntries(applicationId: string, userId: string) {
        // Placeholder for GL reversal until proper ledger system is implemented
        console.log(`GL entries would be reversed for payment application ${applicationId} by user ${userId}`);
    }

    private async getARAccount(entityId: string) {
        return this.prisma.chartAccount.findFirst({
            where: {
                entityId,
                accountCode: '1200',
                accountType: AccountType.ASSET,
            },
        });
    }

    private async getCashAccount(entityId: string) {
        return this.prisma.chartAccount.findFirst({
            where: {
                entityId,
                accountCode: '1000',
                accountType: AccountType.ASSET,
            },
        });
    }
}