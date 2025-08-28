// src/financials/financials.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
// import { UserRole, InvoiceStatus, PaymentStatus, InvoiceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankLedgerDto } from './dto/create-bank-ledger.dto';
import { UpdateBankLedgerDto } from './dto/update-bank-ledger.dto';
import { CreateChartAccountDto } from './dto/create-chart-account.dto';
import { UpdateChartAccountDto } from './dto/update-chart-account.dto';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FinancialQueryDto, InvoiceQueryDto, PaymentQueryDto, LedgerQueryDto } from './dto/financial-query.dto';
import {
  InvoiceType,
  InvoiceStatus,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
  UserRole
} from '@prisma/client';

@Injectable()
export class FinancialsService {
  constructor(private prisma: PrismaService) { }

  async getEntityFinancialSummary(entityId: string, startDate?: Date, endDate?: Date) {
    const dateFilter = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };

    const [invoices, payments, chartAccounts] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          entityId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),
      this.prisma.payment.findMany({
        where: {
          entityId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),
      this.prisma.chartAccount.findMany({
        where: { entityId, isActive: true },
      }),
    ]);

    const summary = {
      totalInvoices: invoices.length,
      totalInvoiceAmount: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
      totalPaid: invoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0),
      totalOutstanding: invoices.reduce((sum, inv) => sum + Number(inv.balanceAmount), 0),
      totalPayments: payments.length,
      totalPaymentAmount: payments.reduce((sum, pay) => sum + Number(pay.amount), 0),
      chartAccountsCount: chartAccounts.length,
      accountsByType: chartAccounts.reduce((acc, account) => {
        acc[account.accountType] = (acc[account.accountType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return summary;
  }

  // ============= BANK LEDGERS =============

  async createBankLedger(
    createBankLedgerDto: {
      entityId: string;
      accountName: string;
      accountNumber?: string;
      bankName?: string;
      accountType: string;
    },
    userRole?: string,
    userOrgId?: string,
    entityIds?: string[]
  ) {
    // You can add authorization logic here if needed
    return this.prisma.bankLedger.create({
      data: createBankLedgerDto,
      include: {
        entity: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findAllBankLedgers(query: FinancialQueryDto, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    const { page, limit, search, entityId } = query;

    // Build where clause based on permissions
    let where: any = {};

    if (userRole === UserRole.SUPER_ADMIN) {
      // Super admin can see all bank ledgers
    } else if (userRole === UserRole.ORG_ADMIN || userRole === UserRole.ACCOUNTANT) {
      // Org admin and accountant can see all in their organization
      where.entity = { organizationId: userOrgId };
    } else if (userRole === UserRole.ENTITY_MANAGER) {
      // Entity manager can see ledgers for entities they manage
      where.entityId = { in: userEntities };
    } else {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Add filters
    if (search) {
      where.OR = [
        { accountName: { contains: search, mode: 'insensitive' } },
        { bankName: { contains: search, mode: 'insensitive' } },
        { accountNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (entityId) {
      await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);
      where.entityId = entityId;
    }

    return this.prisma.paginate(this.prisma.bankLedger, {
      page,
      limit,
      where,
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
      orderBy: { accountName: 'asc' },
    });
  }

  async findOneBankLedger(id: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    const bankLedger = await this.prisma.bankLedger.findUnique({
      where: { id },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
        ledgerEntries: {
          include: {
            chartAccount: {
              select: {
                accountCode: true,
                accountName: true,
                accountType: true,
              },
            },
            createdBy: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { transactionDate: 'desc' },
          take: 20, // Last 20 transactions
        },
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
    });

    if (!bankLedger) {
      throw new NotFoundException('Bank ledger not found');
    }

    // Check access permissions
    await this.verifyEntityAccess(bankLedger.entityId, userRole, userOrgId, userEntities);

    return bankLedger;
  }

  async updateBankLedger(id: string, updateBankLedgerDto: UpdateBankLedgerDto, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    const bankLedger = await this.prisma.bankLedger.findUnique({
      where: { id },
      include: { entity: true },
    });

    if (!bankLedger) {
      throw new NotFoundException('Bank ledger not found');
    }

    // Check access permissions
    await this.verifyEntityAccess(bankLedger.entityId, userRole, userOrgId, userEntities);

    const updatedBankLedger = await this.prisma.bankLedger.update({
      where: { id },
      data: updateBankLedgerDto,
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
    });

    return updatedBankLedger;
  }

  async findBankLedgersByEntity(entityId: string) {
    return this.prisma.bankLedger.findMany({
      where: { entityId, isActive: true },
      orderBy: { accountName: 'asc' },
      include: {
        entity: {
          select: { id: true, name: true },
        },
      },
    });
  }

  // ============= CHART OF ACCOUNTS =============

  async createChartAccount(
    createChartAccountDto: CreateChartAccountDto,
    userRole?: string,
    userOrgId?: string,
    entityIds?: string[]
  ) {
    // You can add authorization logic here if needed

    // Check if account code already exists for this entity
    const existingAccount = await this.prisma.chartAccount.findUnique({
      where: {
        entityId_accountCode: {
          entityId: createChartAccountDto.entityId,
          accountCode: createChartAccountDto.accountCode,
        },
      },
    });

    if (existingAccount) {
      throw new ConflictException(
        `Account code ${createChartAccountDto.accountCode} already exists for this entity`
      );
    }

    // Create the chart account - destructure to avoid entityId type conflict
    const { entityId, accountCode, accountName, accountType, description, isActive } = createChartAccountDto;

    const chartAccount = await this.prisma.chartAccount.create({
      data: {
        entityId,
        accountCode,
        accountName,
        accountType,
        description,
        isActive: isActive ?? true,
      },
      include: {
        entity: {
          select: { id: true, name: true },
        },
      },
    });

    return chartAccount;
  }
  async findAllChartAccounts(query: FinancialQueryDto, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    const { page, limit, search, entityId } = query;

    // Build where clause based on permissions
    let where: any = {};

    if (userRole === UserRole.SUPER_ADMIN) {
      // Super admin can see all chart accounts
    } else if (userRole === UserRole.ORG_ADMIN || userRole === UserRole.ACCOUNTANT) {
      // Org admin and accountant can see all in their organization
      where.entity = { organizationId: userOrgId };
    } else if (userRole === UserRole.ENTITY_MANAGER) {
      // Entity manager can see accounts for entities they manage
      where.entityId = { in: userEntities };
    } else {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Add filters
    if (search) {
      where.OR = [
        { accountCode: { contains: search, mode: 'insensitive' } },
        { accountName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (entityId) {
      await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);
      where.entityId = entityId;
    }

    return this.prisma.paginate(this.prisma.chartAccount, {
      page,
      limit,
      where,
      include: {
        entity: { select: { id: true, name: true } },
        _count: { select: { ledgerEntries: true } },
      },
      orderBy: { accountCode: 'asc' },
    });
  }

  async findChartAccountsByEntity(entityId: string) {
    return this.prisma.chartAccount.findMany({
      where: { entityId, isActive: true },
      orderBy: { accountCode: 'asc' },
      include: {
        entity: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findChartAccount(id: string) {
    const chartAccount = await this.prisma.chartAccount.findUnique({
      where: { id },
      include: {
        entity: {
          select: { id: true, name: true },
        },
      },
    });

    if (!chartAccount) {
      throw new NotFoundException('Chart account not found');
    }

    return chartAccount;
  }

  async updateChartAccount(id: string, updateData: Partial<CreateChartAccountDto>) {
    const chartAccount = await this.findChartAccount(id);

    // Check if account code is being changed and if it conflicts
    if (updateData.accountCode && updateData.accountCode !== chartAccount.accountCode) {
      const existingAccount = await this.prisma.chartAccount.findUnique({
        where: {
          entityId_accountCode: {
            entityId: chartAccount.entityId,
            accountCode: updateData.accountCode,
          },
        },
      });

      if (existingAccount) {
        throw new ConflictException(
          `Account code ${updateData.accountCode} already exists for this entity`
        );
      }
    }

    return this.prisma.chartAccount.update({
      where: { id },
      data: updateData,
      include: {
        entity: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteChartAccount(id: string) {
    const chartAccount = await this.findChartAccount(id);

    // Check if account has any ledger entries
    const ledgerEntryCount = await this.prisma.ledgerEntry.count({
      where: { chartAccountId: id },
    });

    if (ledgerEntryCount > 0) {
      throw new ConflictException(
        'Cannot delete chart account that has associated ledger entries. Deactivate instead.'
      );
    }

    // Check if account has any invoice line items
    const invoiceLineItemCount = await this.prisma.invoiceLineItem.count({
      where: { chartAccountId: id },
    });

    if (invoiceLineItemCount > 0) {
      throw new ConflictException(
        'Cannot delete chart account that has associated invoice line items. Deactivate instead.'
      );
    }

    await this.prisma.chartAccount.delete({
      where: { id },
    });

    return { message: 'Chart account deleted successfully' };
  }

  async deactivateChartAccount(id: string) {
    return this.prisma.chartAccount.update({
      where: { id },
      data: { isActive: false },
      include: {
        entity: {
          select: { id: true, name: true },
        },
      },
    });
  }

  // ============= LEDGER ENTRIES =============



  async createLedgerEntry(createLedgerEntryDto: CreateLedgerEntryDto, userId: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    // Check permissions
    if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.ACCOUNTANT) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Verify bank ledger and chart account access
    const [bankLedger, chartAccount] = await Promise.all([
      this.prisma.bankLedger.findUnique({
        where: { id: createLedgerEntryDto.bankLedgerId },
        include: { entity: true },
      }),
      this.prisma.chartAccount.findUnique({
        where: { id: createLedgerEntryDto.chartAccountId },
        include: { entity: true },
      }),
    ]);

    if (!bankLedger) {
      throw new NotFoundException('Bank ledger not found');
    }

    if (!chartAccount) {
      throw new NotFoundException('Chart account not found');
    }

    // Verify both belong to same entity
    if (bankLedger.entityId !== chartAccount.entityId) {
      throw new BadRequestException('Bank ledger and chart account must belong to the same entity');
    }

    // Check access permissions
    await this.verifyEntityAccess(bankLedger.entityId, userRole, userOrgId, userEntities);

    // Use transaction to create ledger entry and update bank balance
    const result = await this.prisma.$transaction(async (tx) => {
      // Create ledger entry
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          ...createLedgerEntryDto,
          transactionDate: new Date(createLedgerEntryDto.transactionDate),
          createdById: userId,
        },
        include: {
          bankLedger: {
            select: {
              id: true,
              accountName: true,
            },
          },
          chartAccount: {
            select: {
              accountCode: true,
              accountName: true,
              accountType: true,
            },
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Update bank ledger balance
      const balanceChange = createLedgerEntryDto.transactionType === 'DEBIT'
        ? -createLedgerEntryDto.amount
        : createLedgerEntryDto.amount;

      await tx.bankLedger.update({
        where: { id: createLedgerEntryDto.bankLedgerId },
        data: {
          currentBalance: {
            increment: balanceChange,
          },
        },
      });

      return ledgerEntry;
    });

    return result;
  }

  async findAllLedgerEntries(query: LedgerQueryDto, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    const { page, limit, search, startDate, endDate, entityId, transactionType, bankLedgerId, chartAccountId, reconciled } = query;

    // Build where clause based on permissions
    let where: any = {};

    if (userRole === UserRole.SUPER_ADMIN) {
      // Super admin can see all ledger entries
    } else if (userRole === UserRole.ORG_ADMIN || userRole === UserRole.ACCOUNTANT) {
      // Org admin and accountant can see all in their organization
      where.bankLedger = { entity: { organizationId: userOrgId } };
    } else if (userRole === UserRole.ENTITY_MANAGER) {
      // Entity manager can see entries for entities they manage
      where.bankLedger = { entityId: { in: userEntities } };
    } else {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Add filters
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { chartAccount: { accountName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate) {
      where.transactionDate = { ...where.transactionDate, gte: new Date(startDate) };
    }

    if (endDate) {
      where.transactionDate = { ...where.transactionDate, lte: new Date(endDate) };
    }

    if (entityId) {
      await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);
      where.bankLedger = { ...where.bankLedger, entityId };
    }

    if (transactionType) {
      where.transactionType = transactionType;
    }

    if (bankLedgerId) {
      where.bankLedgerId = bankLedgerId;
    }

    if (chartAccountId) {
      where.chartAccountId = chartAccountId;
    }

    if (reconciled !== undefined) {
      where.reconciled = reconciled;
    }

    return this.prisma.paginate(this.prisma.ledgerEntry, {
      page,
      limit,
      where,
      include: {
        bankLedger: {
          select: {
            id: true,
            accountName: true,
            entity: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        chartAccount: {
          select: {
            accountCode: true,
            accountName: true,
            accountType: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  // ============= INVOICES =============

  // Simple Invoice Creation (for the existing controller method)
  async createInvoice(
    createInvoiceDto: CreateInvoiceDto,
    userRole?: string,
    userOrgId?: string,
    entityIds?: string[],
    propertyIds?: string[]
  ) {
    // You can add authorization logic here if needed

    // Generate invoice number if not provided
    const invoiceNumber = await this.generateInvoiceNumber(createInvoiceDto.entityId);

    // Calculate totals from line items
    const subtotal = createInvoiceDto.lineItems.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice), 0
    );
    const taxAmount = createInvoiceDto.taxAmount || 0;
    const totalAmount = subtotal + taxAmount;

    return this.prisma.$transaction(async (prisma) => {
      // Create the invoice
      const invoice = await prisma.invoice.create({
        data: {
          entityId: createInvoiceDto.entityId,
          invoiceNumber,
          invoiceType: createInvoiceDto.invoiceType || InvoiceType.RENT,
          tenantId: createInvoiceDto.tenantId,
          vendorId: createInvoiceDto.vendorId,
          customerName: createInvoiceDto.customerName,
          customerEmail: createInvoiceDto.customerEmail,
          propertyId: createInvoiceDto.propertyId,
          spaceId: createInvoiceDto.spaceId,
          leaseId: createInvoiceDto.leaseId,
          issueDate: createInvoiceDto.issueDate ? new Date(createInvoiceDto.issueDate) : new Date(),
          dueDate: new Date(createInvoiceDto.dueDate),
          subtotal,
          taxAmount,
          totalAmount,
          balanceAmount: totalAmount,
          paidAmount: 0,
          status: InvoiceStatus.DRAFT,
          description: createInvoiceDto.description,
          terms: createInvoiceDto.terms,
          memo: createInvoiceDto.memo,
          internalNotes: createInvoiceDto.internalNotes,
          lateFeeAmount: createInvoiceDto.lateFeeAmount,
          lateFeeDays: createInvoiceDto.lateFeeDays,
        },
      });

      // Create line items
      if (createInvoiceDto.lineItems && createInvoiceDto.lineItems.length > 0) {
        const lineItemsData = createInvoiceDto.lineItems.map((item, index) => ({
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

      return this.findInvoiceById(invoice.id);
    });
  }

  async findAllInvoices(query: InvoiceQueryDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    const { page, limit, search, startDate, endDate, entityId, propertyId, status, leaseId, overdue } = query;

    // Build where clause based on permissions
    let where: any = {};

    if (userRole === UserRole.SUPER_ADMIN) {
      // Super admin can see all invoices
    } else if (userRole === UserRole.ORG_ADMIN || userRole === UserRole.ACCOUNTANT) {
      // Org admin and accountant can see all in their organization
      where.entity = { organizationId: userOrgId };
    } else if (userRole === UserRole.ENTITY_MANAGER) {
      // Entity manager can see invoices for entities they manage
      where.entityId = { in: userEntities };
    } else if (userRole === UserRole.PROPERTY_MANAGER) {
      // Property manager can see invoices for properties they manage
      where.propertyId = { in: userProperties };
    } else if (userRole === UserRole.TENANT) {
      // Tenants can only see their own invoices
      where.tenantId = userOrgId;
    } else {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Add filters
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    if (status) {
      where.status = status;
    }

    if (leaseId) {
      where.leaseId = leaseId;
    }

    if (overdue) {
      const today = new Date();
      where.dueDate = { lt: today };
      where.status = { in: ['SENT', 'OVERDUE'] };
    }

    if (entityId) {
      await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);
      where.entityId = entityId;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    return this.prisma.paginate(this.prisma.invoice, {
      page,
      limit,
      where,
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
        lease: {
          select: {
            id: true,
            monthlyRent: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneInvoice(id: string, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
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
            monthlyRent: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check access permissions based on invoice fields directly
    if (userRole !== UserRole.SUPER_ADMIN) {
      if (userRole === UserRole.TENANT && invoice.tenantId !== userOrgId) {
        throw new ForbiddenException('Can only view your own invoices');
      }
      if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(invoice.entityId)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(invoice.propertyId)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return invoice;
  }

  async updateInvoice(id: string, updateInvoiceDto: UpdateInvoiceDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check access permissions
    if (userRole !== UserRole.SUPER_ADMIN) {
      if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(invoice.entityId)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(invoice.propertyId)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Don't allow updates to paid invoices
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot update paid invoices');
    }

    const { lineItems, entityId, ...safeUpdateData } = updateInvoiceDto;

    // Build the update data object with proper typing
    const updateData: any = {
      ...safeUpdateData,
      // Convert date string to Date object if provided
      ...(updateInvoiceDto.dueDate && { dueDate: new Date(updateInvoiceDto.dueDate) }),
    };

    // Remove undefined values to avoid Prisma issues
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        lineItems: true,
        tenant: true,
        property: true,
        paymentApplications: {
          include: {
            payment: true,
          },
        },
      },
    });

    // Handle line items update separately if provided
    if (lineItems && lineItems.length > 0) {
      // Delete existing line items
      await this.prisma.invoiceLineItem.deleteMany({
        where: { invoiceId: id },
      });

      // Create new line items
      await this.prisma.invoiceLineItem.createMany({
        data: lineItems.map((item, index) => ({
          invoiceId: id,
          lineNumber: index + 1,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          chartAccountId: item.chartAccountId,
          propertyId: item.propertyId,
          spaceId: item.spaceId,
        })),
      });

      // Recalculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const taxAmount = updateInvoiceDto.taxAmount || 0;
      const totalAmount = subtotal + taxAmount;

      // Update invoice with new totals
      await this.prisma.invoice.update({
        where: { id },
        data: {
          subtotal,
          totalAmount,
          balanceAmount: totalAmount - this.toNumber(updatedInvoice.paidAmount || 0),
        },
      });
    }

    return updatedInvoice;
  }

  async findInvoiceById(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: { lineNumber: 'asc' },
          include: {
            chartAccount: true,
            property: true,
            space: true,
          },
        },
        tenant: true,
        vendor: true,
        property: true,
        space: true,
        lease: true,
        paymentApplications: {
          include: {
            payment: true,
          },
        },
      },
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

  // ============= PAYMENTS =============

  async createPayment(createPaymentDto: CreatePaymentDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    // Check permissions
    if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.PROPERTY_MANAGER && userRole !== UserRole.ACCOUNTANT && userRole !== UserRole.TENANT) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Use transaction to create payment
    const result = await this.prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          entityId: createPaymentDto.entityId,
          paymentNumber: createPaymentDto.paymentNumber || `PAY-${Date.now()}`,
          paymentType: createPaymentDto.paymentType,
          paymentMethod: createPaymentDto.paymentMethod,
          payerName: createPaymentDto.payerName,
          amount: createPaymentDto.amount,
          paymentDate: new Date(createPaymentDto.paymentDate || Date.now()),
          status: (createPaymentDto.status as PaymentStatus) || 'PENDING',
          referenceNumber: createPaymentDto.referenceNumber,
          memo: createPaymentDto.memo,
        },
      });

      return payment;
    });

    return result;
  }

  async findAllPayments(query: PaymentQueryDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    const { page, limit, search, startDate, endDate, entityId, propertyId, status } = query;

    // Build where clause based on permissions
    let where: any = {};

    if (userRole === UserRole.SUPER_ADMIN) {
      // Super admin can see all payments
    } else if (userRole === UserRole.ORG_ADMIN || userRole === UserRole.ACCOUNTANT) {
      // Org admin and accountant can see all in their organization
      where.entity = { organizationId: userOrgId };
    } else if (userRole === UserRole.ENTITY_MANAGER) {
      // Entity manager can see payments for entities they manage
      where.entityId = { in: userEntities };
    } else if (userRole === UserRole.PROPERTY_MANAGER) {
      // Property manager - need to filter by properties they manage somehow
      // This would need adjustment based on your payment-property relationship
    } else if (userRole === UserRole.TENANT) {
      // Tenants can only see their own payments
      where.payerId = userOrgId;
    } else {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Add filters
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { memo: { contains: search, mode: 'insensitive' } },
        { payerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate) {
      where.paymentDate = { ...where.paymentDate, gte: new Date(startDate) };
    }

    if (endDate) {
      where.paymentDate = { ...where.paymentDate, lte: new Date(endDate) };
    }

    if (status) {
      where.status = status;
    }

    if (entityId) {
      await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);
      where.entityId = entityId;
    }

    return this.prisma.paginate(this.prisma.payment, {
      page,
      limit,
      where,
      include: {
        entity: {
          select: {
            id: true,
            name: true,
          },
        },
        payer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  // ============= FINANCIAL REPORTS =============

  async getFinancialSummary(entityId: string, userRole: UserRole, userOrgId: string, userEntities: string[], startDate?: string, endDate?: string) {
    // Verify entity access
    await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1); // Start of year
    const end = endDate ? new Date(endDate) : new Date(); // Today

    // Get all financial data for the entity
    const [
      totalInvoices,
      totalPayments,
      outstandingInvoices,
      overdueInvoices,
      bankLedgers,
    ] = await Promise.all([
      // Total invoices in period
      this.prisma.invoice.aggregate({
        where: {
          entityId,
          createdAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),

      // Total payments in period
      this.prisma.payment.aggregate({
        where: {
          entityId,
          paymentDate: { gte: start, lte: end },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Outstanding invoices
      this.prisma.invoice.aggregate({
        where: {
          entityId,
          status: { in: ['SENT', 'OVERDUE'] },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),

      // Overdue invoices
      this.prisma.invoice.aggregate({
        where: {
          entityId,
          status: 'OVERDUE',
          dueDate: { lt: new Date() },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),

      // Bank ledger totals
      this.prisma.bankLedger.aggregate({
        where: { entityId, isActive: true },
        _sum: { currentBalance: true },
        _count: true,
      }),
    ]);

    return {
      period: { startDate: start, endDate: end },
      invoices: {
        total: totalInvoices._sum.totalAmount || 0,
        count: totalInvoices._count,
        outstanding: outstandingInvoices._sum.totalAmount || 0,
        outstandingCount: outstandingInvoices._count,
        overdue: overdueInvoices._sum.totalAmount || 0,
        overdueCount: overdueInvoices._count,
      },
      payments: {
        total: totalPayments._sum.amount || 0,
        count: totalPayments._count,
      },
      banking: {
        totalBalance: bankLedgers._sum.currentBalance || 0,
        accountCount: bankLedgers._count,
      },
    };
  }

  async getRentRoll(entityId: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    // Verify entity access
    await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

    const rentRoll = await this.prisma.lease.findMany({
      where: {
        space: { property: { entityId } },
        status: 'ACTIVE',
      },
      include: {
        space: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        invoices: {
          where: { status: { in: ['SENT', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' },
          take: 1, // Most recent outstanding invoice
        },
      },
      orderBy: [
        { space: { property: { name: 'asc' } } },
        { space: { name: 'asc' } },
      ],
    });

    const summary = {
      totalUnits: rentRoll.length,
      totalRent: rentRoll.reduce((sum, lease) => sum + Number(lease.monthlyRent), 0),
      totalOutstanding: rentRoll.reduce((sum, lease) => {
        const outstanding = lease.invoices.reduce((invoiceSum, invoice) => invoiceSum + Number(invoice.totalAmount), 0);
        return sum + outstanding;
      }, 0),
    };

    return { rentRoll, summary };
  }

  async reconcileLedgerEntry(entryId: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    // Check permissions
    if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.ACCOUNTANT) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const ledgerEntry = await this.prisma.ledgerEntry.findUnique({
      where: { id: entryId },
      include: {
        bankLedger: {
          include: {
            entity: true,
          },
        },
      },
    });

    if (!ledgerEntry) {
      throw new NotFoundException('Ledger entry not found');
    }

    // Check access permissions
    await this.verifyEntityAccess(ledgerEntry.bankLedger.entityId, userRole, userOrgId, userEntities);

    const updatedEntry = await this.prisma.ledgerEntry.update({
      where: { id: entryId },
      data: {
        reconciled: true,
        reconciledAt: new Date(),
      },
      include: {
        bankLedger: {
          select: {
            id: true,
            accountName: true,
          },
        },
        chartAccount: {
          select: {
            accountCode: true,
            accountName: true,
            accountType: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedEntry;
  }

  async generateInvoicesForEntity(entityId: string, invoiceDate: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    // Check permissions
    if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.ACCOUNTANT) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Verify entity access
    await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

    const invoiceDateObj = new Date(invoiceDate);
    const dueDate = new Date(invoiceDateObj);
    dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

    // Get all active leases for the entity
    const activeLeases = await this.prisma.lease.findMany({
      where: {
        space: { property: { entityId } },
        status: 'ACTIVE',
      },
      include: {
        space: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const createdInvoices = [];
    let invoiceCounter = 1;

    for (const lease of activeLeases) {
      // Generate unique invoice number
      const invoiceNumber = `INV-${invoiceDateObj.getFullYear()}-${String(invoiceCounter).padStart(4, '0')}`;

      // Check if invoice already exists for this period
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: {
          leaseId: lease.id,
          invoiceNumber,
        },
      });

      if (!existingInvoice) {
        const invoice = await this.prisma.invoice.create({
          data: {
            entityId,
            leaseId: lease.id,
            tenantId: lease.tenantId,
            propertyId: lease.propertyId,
            spaceId: lease.spaceId,
            invoiceNumber,
            invoiceType: 'RENT',
            totalAmount: Number(lease.monthlyRent) + Number(lease.nnnExpenses || 0),
            dueDate,
            status: 'DRAFT',
            description: `Monthly rent for ${lease.space.property.name} - Unit ${lease.space.name}`,
            memo: 'Monthly rent invoice',
          },
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
          },
        });

        createdInvoices.push(invoice);
        invoiceCounter++;
      }
    }

    return {
      message: `Generated ${createdInvoices.length} invoices for entity`,
      invoices: createdInvoices,
    };
  }

  // ============= HELPER METHODS =============

  private async verifyEntityAccess(entityId: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    if (userRole !== UserRole.SUPER_ADMIN) {
      if ((userRole === UserRole.ORG_ADMIN || userRole === UserRole.ACCOUNTANT) && entity.organizationId !== userOrgId) {
        throw new ForbiddenException('No access to this entity');
      }
      if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(entityId)) {
        throw new ForbiddenException('No access to this entity');
      }
    }

    return entity;
  }

  private toNumber(decimal: any): number {
    if (decimal === null || decimal === undefined) return 0;
    if (typeof decimal === 'number') return decimal;
    if (typeof decimal === 'string') return parseFloat(decimal);
    // Handle Prisma Decimal type
    if (decimal.toNumber) return decimal.toNumber();
    return Number(decimal);
  }
}