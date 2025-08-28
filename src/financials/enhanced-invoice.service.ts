// src/financials/enhanced-invoice.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceType, InvoiceStatus, AccountType } from '@prisma/client';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto';

@Injectable()
export class EnhancedInvoiceService {
    constructor(private prisma: PrismaService) { }

    async create(createInvoiceDto: CreateInvoiceDto, userId: string) {
        const { lineItems, ...invoiceData } = createInvoiceDto;

        return this.prisma.$transaction(async (prisma) => {
            // Generate invoice number
            const invoiceNumber = await this.generateInvoiceNumber(createInvoiceDto.entityId);

            // Calculate totals from line items
            const subtotal = lineItems.reduce((sum, item) =>
                sum + (item.quantity * item.unitPrice), 0
            );
            const taxAmount = createInvoiceDto.taxAmount || 0;
            const totalAmount = subtotal + taxAmount;

            // Create invoice
            const invoice = await prisma.invoice.create({
                data: {
                    ...invoiceData,
                    invoiceNumber,
                    subtotal,
                    totalAmount,
                    balanceAmount: totalAmount,
                    paidAmount: 0,
                    status: InvoiceStatus.DRAFT,
                    issueDate: createInvoiceDto.issueDate ? new Date(createInvoiceDto.issueDate) : new Date(),
                    dueDate: new Date(createInvoiceDto.dueDate),
                },
            });

            // Create line items
            if (lineItems && lineItems.length > 0) {
                const lineItemsData = lineItems.map((item, index) => ({
                    invoiceId: invoice.id,
                    lineNumber: index + 1,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineTotal: item.quantity * item.unitPrice,
                    chartAccountId: item.chartAccountId,
                    propertyId: item.propertyId,
                    spaceId: item.spaceId,
                    itemCode: item.itemCode,
                    startDate: item.startDate ? new Date(item.startDate) : null,
                    endDate: item.endDate ? new Date(item.endDate) : null,
                }));

                await prisma.invoiceLineItem.createMany({
                    data: lineItemsData,
                });
            }

            // Create GL entries for draft invoice
            await this.createInvoiceGLEntries(invoice.id, userId);

            return this.findOne(invoice.id);
        });
    }

    async findAll(entityId: string, query: any = {}) {
        const {
            status,
            invoiceType,
            tenantId,
            propertyId,
            startDate,
            endDate,
            search,
            limit = 50,
            offset = 0,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = query;

        let whereClause: any = { entityId };

        // Apply filters
        if (status) whereClause.status = status;
        if (invoiceType) whereClause.invoiceType = invoiceType;
        if (tenantId) whereClause.tenantId = tenantId;
        if (propertyId) whereClause.propertyId = propertyId;

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt.gte = new Date(startDate);
            if (endDate) whereClause.createdAt.lte = new Date(endDate);
        }

        if (search) {
            whereClause.OR = [
                { invoiceNumber: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } }, // Fixed: was billToName
            ];
        }

        const [invoices, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where: whereClause,
                include: {
                    tenant: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    property: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                        },
                    },
                    space: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    lineItems: true,
                    paymentApplications: {
                        include: {
                            payment: {
                                select: {
                                    id: true,
                                    paymentNumber: true,
                                    amount: true,
                                    paymentDate: true,
                                    payerName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                take: Number(limit),
                skip: Number(offset),
            }),
            this.prisma.invoice.count({ where: whereClause }),
        ]);

        return {
            invoices,
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset),
                pages: Math.ceil(total / Number(limit)),
            },
        };
    }

    async findOne(id: string) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: {
                tenant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                vendor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                property: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
                space: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                lease: {
                    select: {
                        id: true,
                        startDate: true,
                        endDate: true,
                    },
                },
                lineItems: {
                    orderBy: { lineNumber: 'asc' },
                    include: {
                        chartAccount: {
                            select: {
                                id: true,
                                accountName: true,
                                accountCode: true,
                            },
                        },
                        property: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        space: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                paymentApplications: {
                    include: {
                        payment: {
                            select: {
                                id: true,
                                paymentNumber: true,
                                amount: true,
                                paymentDate: true,
                                paymentType: true,
                                payerName: true,
                                status: true,
                            },
                        },
                    },
                    orderBy: { appliedDate: 'desc' },
                },
                attachments: true,
            },
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        // Calculate payment summary
        const paymentSummary = {
            totalApplied: invoice.paymentApplications.reduce(
                (sum, app) => sum + Number(app.appliedAmount),
                0
            ),
            remainingBalance: Number(invoice.balanceAmount),
            isFullyPaid: Number(invoice.balanceAmount) <= 0,
        };

        return {
            ...invoice,
            paymentSummary,
        };
    }

    async update(id: string, updateInvoiceDto: UpdateInvoiceDto) {
        const { lineItems, ...invoiceData } = updateInvoiceDto;

        return this.prisma.$transaction(async (prisma) => {
            // Update invoice basic data
            const updateData: any = { ...invoiceData };

            if (invoiceData.issueDate) {
                updateData.issueDate = new Date(invoiceData.issueDate);
            }
            if (invoiceData.dueDate) {
                updateData.dueDate = new Date(invoiceData.dueDate);
            }

            await prisma.invoice.update({
                where: { id },
                data: updateData,
            });

            // Handle line items if provided
            if (lineItems) {
                // Delete existing line items
                await prisma.invoiceLineItem.deleteMany({
                    where: { invoiceId: id },
                });

                // Create new line items and recalculate totals
                if (lineItems.length > 0) {
                    const lineItemsData = lineItems.map((item, index) => ({
                        invoiceId: id,
                        lineNumber: index + 1,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        lineTotal: item.quantity * item.unitPrice,
                        chartAccountId: item.chartAccountId,
                        propertyId: item.propertyId,
                        spaceId: item.spaceId,
                        itemCode: item.itemCode,
                        startDate: item.startDate ? new Date(item.startDate) : null,
                        endDate: item.endDate ? new Date(item.endDate) : null,
                    }));

                    await prisma.invoiceLineItem.createMany({
                        data: lineItemsData,
                    });

                    // Recalculate invoice totals
                    const subtotal = lineItemsData.reduce((sum, item) => sum + item.lineTotal, 0);
                    const taxAmount = updateInvoiceDto.taxAmount || 0;
                    const totalAmount = subtotal + taxAmount;

                    // Get current invoice to preserve paid amount
                    const currentInvoice = await prisma.invoice.findUnique({
                        where: { id },
                        select: { paidAmount: true },
                    });

                    const paidAmount = Number(currentInvoice.paidAmount || 0);
                    const balanceAmount = totalAmount - paidAmount;

                    await prisma.invoice.update({
                        where: { id },
                        data: {
                            subtotal,
                            totalAmount,
                            balanceAmount,
                        },
                    });
                }
            }

            return this.findOne(id);
        });
    }

    async updateStatus(id: string, status: InvoiceStatus, userId: string) {
        const invoice = await this.prisma.invoice.update({
            where: { id },
            data: {
                status,
                ...(status === InvoiceStatus.SENT && { issueDate: new Date() }),
                updatedAt: new Date(),
            },
        });

        // Handle status-specific actions
        if (status === InvoiceStatus.SENT) {
            await this.handleInvoiceSent(id, userId);
        } else if (status === InvoiceStatus.VOID) {
            await this.handleInvoiceVoided(id, userId);
        }

        return this.findOne(id);
    }

    async void(id: string, userId: string) {
        return this.prisma.$transaction(async (prisma) => {
            // Check if invoice has payments
            const paymentCount = await prisma.paymentApplication.count({
                where: { invoiceId: id },
            });

            if (paymentCount > 0) {
                throw new BadRequestException(
                    'Cannot void invoice with existing payments. Remove payments first.'
                );
            }

            // Update invoice status
            const invoice = await prisma.invoice.update({
                where: { id },
                data: {
                    status: InvoiceStatus.VOID,
                    updatedAt: new Date(),
                },
            });

            // Reverse GL entries
            await this.reverseInvoiceGLEntries(id, userId);

            return this.findOne(id);
        });
    }

    async delete(id: string) {
        // Check if invoice has payments
        const paymentCount = await this.prisma.paymentApplication.count({
            where: { invoiceId: id },
        });

        if (paymentCount > 0) {
            throw new BadRequestException(
                'Cannot delete invoice with existing payments. Void the invoice instead.'
            );
        }

        await this.prisma.invoice.delete({
            where: { id },
        });

        return { message: 'Invoice deleted successfully' };
    }

    async applyLateFee(id: string, userId: string) {
        const invoice = await this.findOne(id);

        if (invoice.status !== InvoiceStatus.SENT && invoice.status !== InvoiceStatus.OVERDUE) {
            throw new BadRequestException('Can only apply late fees to sent or overdue invoices');
        }

        if (new Date() <= new Date(invoice.dueDate)) {
            throw new BadRequestException('Invoice is not yet overdue');
        }

        if (!invoice.lateFeeAmount || Number(invoice.lateFeeAmount) <= 0) {
            throw new BadRequestException('No late fee amount specified for this invoice');
        }

        return this.prisma.$transaction(async (prisma) => {
            const lateFeeAmount = Number(invoice.lateFeeAmount);

            // Add late fee line item
            await prisma.invoiceLineItem.create({
                data: {
                    invoiceId: id,
                    lineNumber: invoice.lineItems.length + 1,
                    description: `Late Fee - ${invoice.invoiceNumber}`,
                    quantity: 1,
                    unitPrice: lateFeeAmount,
                    lineTotal: lateFeeAmount,
                },
            });

            // Update invoice totals
            const newTotal = Number(invoice.totalAmount) + lateFeeAmount;
            const newBalance = newTotal - Number(invoice.paidAmount);

            await prisma.invoice.update({
                where: { id },
                data: {
                    totalAmount: newTotal,
                    balanceAmount: newBalance,
                    status: InvoiceStatus.OVERDUE,
                    lateFeeApplied: true,
                },
            });

            // Create GL entries for late fee
            await this.createLateFeeLedgerEntries(id, lateFeeAmount, userId);

            return this.findOne(id);
        });
    }

    async generateInvoiceNumber(entityId: string): Promise<string> {
        const currentYear = new Date().getFullYear();
        const prefix = `INV-${currentYear}-`;

        const lastInvoice = await this.prisma.invoice.findFirst({
            where: {
                entityId,
                invoiceNumber: { startsWith: prefix },
            },
            orderBy: { createdAt: 'desc' },
        });

        let nextNumber = 1;
        if (lastInvoice) {
            const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
            nextNumber = lastNumber + 1;
        }

        return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
    }

    // GL Entry Management - Updated to match actual Prisma schema
    private async createInvoiceGLEntries(invoiceId: string, userId: string) {
        // Note: Current schema doesn't have a comprehensive GL entry system
        // This is a placeholder for when you implement proper double-entry bookkeeping
        // For now, we'll skip GL entries until the proper ledger structure is in place
        console.log(`GL entries would be created for invoice ${invoiceId} by user ${userId}`);
    }

    private async reverseInvoiceGLEntries(invoiceId: string, userId: string) {
        // Placeholder for GL reversal logic
        console.log(`GL entries would be reversed for invoice ${invoiceId} by user ${userId}`);
    }

    private async createLateFeeLedgerEntries(invoiceId: string, lateFeeAmount: number, userId: string) {
        // Placeholder for late fee GL entries
        console.log(`Late fee GL entries would be created for invoice ${invoiceId}, amount ${lateFeeAmount}, by user ${userId}`);
    }

    private async handleInvoiceSent(invoiceId: string, userId: string) {
        // Update GL entries if needed
        // Send email notification
        // Log activity
        console.log(`Invoice ${invoiceId} sent by user ${userId}`);
    }

    private async handleInvoiceVoided(invoiceId: string, userId: string) {
        await this.reverseInvoiceGLEntries(invoiceId, userId);
    }

    // Helper methods for chart of accounts
    private async getARAccount(entityId: string) {
        return this.prisma.chartAccount.findFirst({
            where: {
                entityId,
                accountCode: '1200', // Standard A/R account code
                accountType: AccountType.ASSET,
            },
        });
    }

    private async getTaxAccount(entityId: string) {
        return this.prisma.chartAccount.findFirst({
            where: {
                entityId,
                accountCode: '2100', // Standard sales tax payable
                accountType: AccountType.LIABILITY,
            },
        });
    }

    private async getLateFeeAccount(entityId: string) {
        return this.prisma.chartAccount.findFirst({
            where: {
                entityId,
                accountCode: '4200', // Standard late fee income
                accountType: AccountType.REVENUE,
            },
        });
    }
}