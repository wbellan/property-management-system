// src/financials/invoice-workflow.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class InvoiceWorkflowService {
    constructor(private prisma: PrismaService) { }

    // Automated workflow for invoice status transitions
    @Cron(CronExpression.EVERY_DAY_AT_1AM)
    async processOverdueInvoices() {
        const cutoffDate = new Date();
        cutoffDate.setHours(0, 0, 0, 0); // Start of today

        // Find invoices that are past due
        const overdueInvoices = await this.prisma.invoice.findMany({
            where: {
                status: InvoiceStatus.SENT,
                dueDate: { lt: cutoffDate },
                balanceAmount: { gt: 0 }
            }
        });

        for (const invoice of overdueInvoices) {
            await this.prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: InvoiceStatus.OVERDUE }
            });

            // Apply late fees if configured
            if (invoice.lateFeeAmount && Number(invoice.lateFeeAmount) > 0) {
                const daysPastDue = Math.floor(
                    (cutoffDate.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
                );

                // Apply late fee based on days past due threshold
                const lateFeeDays = invoice.lateFeeDays || 5;
                if (daysPastDue >= lateFeeDays && !invoice.lateFeeApplied) {
                    await this.applyAutomaticLateFee(invoice.id);
                }
            }
        }

        return { processedInvoices: overdueInvoices.length };
    }

    private async applyAutomaticLateFee(invoiceId: string) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { lineItems: true }
        });

        if (!invoice || invoice.lateFeeApplied) return;

        await this.prisma.$transaction(async (prisma) => {
            // Add late fee line item
            await prisma.invoiceLineItem.create({
                data: {
                    invoiceId,
                    lineNumber: invoice.lineItems.length + 1,
                    description: `Late Fee - ${invoice.invoiceNumber}`,
                    quantity: 1,
                    unitPrice: invoice.lateFeeAmount,
                    lineTotal: invoice.lateFeeAmount,
                },
            });

            // Update invoice totals
            const newTotal = Number(invoice.totalAmount) + Number(invoice.lateFeeAmount);
            const newBalance = newTotal - Number(invoice.paidAmount);

            await prisma.invoice.update({
                where: { id: invoiceId },
                data: {
                    totalAmount: newTotal,
                    balanceAmount: newBalance,
                    lateFeeApplied: true,
                },
            });
        });
    }

    // Automated recurring invoice generation
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async generateRecurringInvoices() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find recurring invoices due for generation
        const recurringInvoices = await this.prisma.invoice.findMany({
            where: {
                isRecurring: true,
                status: InvoiceStatus.SENT,
                // Add logic for recurring rule evaluation
            },
            include: {
                lineItems: true,
            },
        });

        let generatedCount = 0;

        for (const template of recurringInvoices) {
            // Check if new invoice should be generated based on recurring rule
            if (await this.shouldGenerateRecurringInvoice(template, today)) {
                await this.generateRecurringInvoice(template);
                generatedCount++;
            }
        }

        return { generatedInvoices: generatedCount };
    }

    private async shouldGenerateRecurringInvoice(template: any, today: Date): Promise<boolean> {
        // Parse recurring rule (could be JSON or simple frequency)
        if (!template.recurringRule) return false;

        try {
            const rule = JSON.parse(template.recurringRule);
            const frequency = rule.frequency; // 'monthly', 'weekly', etc.
            const dayOfMonth = rule.dayOfMonth || template.dueDate.getDate();

            // Check if today matches the recurring pattern
            if (frequency === 'monthly' && today.getDate() === dayOfMonth) {
                // Check if invoice for this month already exists
                const existingInvoice = await this.prisma.invoice.findFirst({
                    where: {
                        parentInvoiceId: template.id,
                        createdAt: {
                            gte: new Date(today.getFullYear(), today.getMonth(), 1),
                            lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
                        },
                    },
                });
                return !existingInvoice;
            }

            return false;
        } catch {
            return false;
        }
    }

    private async generateRecurringInvoice(template: any) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), template.dueDate.getDate());

        await this.prisma.$transaction(async (prisma) => {
            // Generate new invoice number
            const invoiceNumber = await this.generateInvoiceNumber(template.entityId);

            // Create new invoice - Fixed field mappings
            const newInvoice = await prisma.invoice.create({
                data: {
                    entityId: template.entityId,
                    invoiceNumber,
                    tenantId: template.tenantId,
                    vendorId: template.vendorId,
                    customerName: template.customerName, // Fixed: was billToName
                    customerEmail: template.customerEmail, // Fixed: was billToEmail  
                    invoiceType: template.invoiceType,
                    propertyId: template.propertyId,
                    spaceId: template.spaceId,
                    leaseId: template.leaseId,
                    subtotal: template.subtotal,
                    taxAmount: template.taxAmount,
                    totalAmount: template.totalAmount,
                    balanceAmount: template.totalAmount,
                    paidAmount: 0,
                    status: InvoiceStatus.DRAFT,
                    dueDate,
                    terms: template.terms, // Fixed: was paymentTerms
                    lateFeeAmount: template.lateFeeAmount,
                    lateFeeDays: template.lateFeeDays, // Fixed: was lateFeeDate
                    description: template.description,
                    memo: template.memo,
                    internalNotes: template.internalNotes,
                    parentInvoiceId: template.id,
                    recurringRule: template.recurringRule,
                },
            });

            // Copy line items
            const lineItemsData = template.lineItems.map((item, index) => ({
                invoiceId: newInvoice.id,
                lineNumber: index + 1,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
                chartAccountId: item.chartAccountId,
                propertyId: item.propertyId,
                spaceId: item.spaceId,
                itemCode: item.itemCode,
                startDate: item.startDate ? new Date(nextMonth.getFullYear(), nextMonth.getMonth(), item.startDate.getDate()) : null,
                endDate: item.endDate ? new Date(nextMonth.getFullYear(), nextMonth.getMonth(), item.endDate.getDate()) : null,
            }));

            await prisma.invoiceLineItem.createMany({
                data: lineItemsData,
            });
        });
    }

    private async generateInvoiceNumber(entityId: string): Promise<string> {
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
}