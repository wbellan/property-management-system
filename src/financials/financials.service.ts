// src/financials/financials.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
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

@Injectable()
export class FinancialsService {
  constructor(private prisma: PrismaService) { }

  // ============= BANK LEDGERS =============

  async createBankLedger(createBankLedgerDto: CreateBankLedgerDto, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    // Check permissions
    if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.ACCOUNTANT) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Verify entity access
    await this.verifyEntityAccess(createBankLedgerDto.entityId, userRole, userOrgId, userEntities);

    const bankLedger = await this.prisma.bankLedger.create({
      data: createBankLedgerDto,
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
    });

    return bankLedger;
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

  // ============= CHART OF ACCOUNTS =============

  async createChartAccount(createChartAccountDto: CreateChartAccountDto, userRole: UserRole, userOrgId: string, userEntities: string[]) {
    // Check permissions
    if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.ACCOUNTANT) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Verify entity access
    await this.verifyEntityAccess(createChartAccountDto.entityId, userRole, userOrgId, userEntities);

    // Check if account code already exists for this entity
    const existingAccount = await this.prisma.chartOfAccount.findUnique({
      where: {
        entityId_accountCode: {
          entityId: createChartAccountDto.entityId,
          accountCode: createChartAccountDto.accountCode,
        },
      },
    });

    if (existingAccount) {
      throw new BadRequestException(`Account code ${createChartAccountDto.accountCode} already exists for this entity`);
    }

    const chartAccount = await this.prisma.chartOfAccount.create({
      data: createChartAccountDto,
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

    return this.prisma.paginate(this.prisma.chartOfAccount, {
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
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
      orderBy: { accountCode: 'asc' },
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
      this.prisma.chartOfAccount.findUnique({
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

  async createInvoice(createInvoiceDto: CreateInvoiceDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    // Check permissions
    if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.PROPERTY_MANAGER && userRole !== UserRole.ACCOUNTANT) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Verify lease exists and user has access
    const lease = await this.prisma.lease.findUnique({
      where: { id: createInvoiceDto.leaseId },
      include: {
        space: {
          include: {
            property: {
              include: {
                entity: {
                  select: {
                    id: true,
                    organizationId: true,
                  },
                },
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

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    // Check access permissions
    if (userRole !== UserRole.SUPER_ADMIN) {
      if (userRole === UserRole.ORG_ADMIN && lease.space.property.entity.organizationId !== userOrgId) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(lease.space.property.entity.id)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(lease.space.propertyId)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Check if invoice number already exists (should be unique)
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber: createInvoiceDto.invoiceNumber },
    });

    if (existingInvoice) {
      throw new BadRequestException(`Invoice number ${createInvoiceDto.invoiceNumber} already exists`);
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        ...createInvoiceDto,
        dueDate: new Date(createInvoiceDto.dueDate),
      },
      include: {
        lease: {
          include: {
            space: {
              include: {
                property: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    entity: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
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
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

    return invoice;
  }

  async findAllInvoices(query: InvoiceQueryDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    const { page, limit, search, startDate, endDate, entityId, propertyId, status, leaseId, overdue } = query;

    // Build where clause based on permissions
    let where: any = {};

    if (userRole === UserRole.SUPER_ADMIN) {
      // Super admin can see all invoices
    } else if (userRole === UserRole.ORG_ADMIN || userRole === UserRole.ACCOUNTANT) {
      // Org admin and accountant can see all in their organization
      where.lease = { space: { property: { entity: { organizationId: userOrgId } } } };
    } else if (userRole === UserRole.ENTITY_MANAGER) {
      // Entity manager can see invoices for entities they manage
      where.lease = { space: { property: { entityId: { in: userEntities } } } };
    } else if (userRole === UserRole.PROPERTY_MANAGER) {
      // Property manager can see invoices for properties they manage
      where.lease = { space: { propertyId: { in: userProperties } } };
    } else if (userRole === UserRole.TENANT) {
      // Tenants can only see their own invoices
      where.lease = { tenantId: userOrgId };
    } else {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Add filters
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { lease: { tenant: { firstName: { contains: search, mode: 'insensitive' } } } },
        { lease: { tenant: { lastName: { contains: search, mode: 'insensitive' } } } },
        { lease: { space: { name: { contains: search, mode: 'insensitive' } } } },
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
      where.lease = { ...where.lease, space: { property: { entityId } } };
    }

    if (propertyId) {
      where.lease = { ...where.lease, space: { propertyId } };
    }

    return this.prisma.paginate(this.prisma.invoice, {
      page,
      limit,
      where,
      include: {
        lease: {
          include: {
            space: {
              include: {
                property: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    entity: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
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
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            payments: true,
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
        lease: {
          include: {
            space: {
              include: {
                property: {
                  include: {
                    entity: {
                      select: {
                        id: true,
                        name: true,
                        organizationId: true,
                      },
                    },
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
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check access permissions
    if (userRole !== UserRole.SUPER_ADMIN) {
      if (userRole === UserRole.ORG_ADMIN && invoice.lease.space.property.entity.organizationId !== userOrgId) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(invoice.lease.space.property.entity.id)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(invoice.lease.space.propertyId)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.TENANT && invoice.lease.tenantId !== userOrgId) {
        throw new ForbiddenException('Can only view your own invoices');
      }
    }

    return invoice;
  }

  async updateInvoice(id: string, updateInvoiceDto: UpdateInvoiceDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            space: {
              include: {
                property: {
                  include: {
                    entity: {
                      select: {
                        id: true,
                        organizationId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check access permissions
    if (userRole !== UserRole.SUPER_ADMIN) {
      if (userRole === UserRole.ORG_ADMIN && invoice.lease.space.property.entity.organizationId !== userOrgId) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(invoice.lease.space.property.entity.id)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(invoice.lease.space.propertyId)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Don't allow updates to paid invoices
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot update paid invoices');
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...updateInvoiceDto,
        ...(updateInvoiceDto.dueDate && { dueDate: new Date(updateInvoiceDto.dueDate) }),
      },
      include: {
        lease: {
          include: {
            space: {
              include: {
                property: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    entity: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
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
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

    return updatedInvoice;
  }

  // ============= PAYMENTS =============

  async createPayment(createPaymentDto: CreatePaymentDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    // Check permissions
    if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.PROPERTY_MANAGER && userRole !== UserRole.ACCOUNTANT && userRole !== UserRole.TENANT) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Verify invoice exists and user has access
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: createPaymentDto.invoiceId },
      include: {
        lease: {
          include: {
            space: {
              include: {
                property: {
                  include: {
                    entity: {
                      select: {
                        id: true,
                        organizationId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check access permissions
    if (userRole !== UserRole.SUPER_ADMIN) {
      if (userRole === UserRole.ORG_ADMIN && invoice.lease.space.property.entity.organizationId !== userOrgId) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(invoice.lease.space.property.entity.id)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(invoice.lease.space.propertyId)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.TENANT && invoice.lease.tenantId !== userOrgId) {
        throw new ForbiddenException('Can only make payments for your own invoices');
      }
    }

    // Check if invoice is already paid
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already paid');
    }

    // Calculate total payments already made
    const totalPaid = invoice.payments.reduce((sum, payment) => {
      return payment.status === 'COMPLETED' ? sum + Number(payment.amount) : sum;
    }, 0);

    // Check if payment amount would exceed invoice amount
    if (totalPaid + createPaymentDto.amount > Number(invoice.amount)) {
      throw new BadRequestException('Payment amount exceeds remaining invoice balance');
    }

    // Use transaction to create payment and update invoice status
    const result = await this.prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          ...createPaymentDto,
          paymentDate: new Date(createPaymentDto.paymentDate),
        },
        include: {
          invoice: {
            include: {
              lease: {
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
              },
            },
          },
        },
      });

      // Update invoice status if fully paid
      // Update invoice status if fully paid
      const newTotalPaid = totalPaid + createPaymentDto.amount;
      if (newTotalPaid >= Number(invoice.amount) && createPaymentDto.status === 'COMPLETED') {
        await tx.invoice.update({
          where: { id: createPaymentDto.invoiceId },
          data: { status: 'PAID' },
        });
      }

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
      where.invoice = { lease: { space: { property: { entity: { organizationId: userOrgId } } } } };
    } else if (userRole === UserRole.ENTITY_MANAGER) {
      // Entity manager can see payments for entities they manage
      where.invoice = { lease: { space: { property: { entityId: { in: userEntities } } } } };
    } else if (userRole === UserRole.PROPERTY_MANAGER) {
      // Property manager can see payments for properties they manage
      where.invoice = { lease: { space: { propertyId: { in: userProperties } } } };
    } else if (userRole === UserRole.TENANT) {
      // Tenants can only see their own payments
      where.invoice = { lease: { tenantId: userOrgId } };
    } else {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Add filters
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { invoice: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
        { invoice: { lease: { tenant: { firstName: { contains: search, mode: 'insensitive' } } } } },
        { invoice: { lease: { tenant: { lastName: { contains: search, mode: 'insensitive' } } } } },
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
      where.invoice = { ...where.invoice, lease: { space: { property: { entityId } } } };
    }

    if (propertyId) {
      where.invoice = { ...where.invoice, lease: { space: { propertyId } } };
    }

    return this.prisma.paginate(this.prisma.payment, {
      page,
      limit,
      where,
      include: {
        invoice: {
          include: {
            lease: {
              include: {
                space: {
                  include: {
                    property: {
                      select: {
                        id: true,
                        name: true,
                        address: true,
                        entity: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
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
            },
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
      monthlyRevenue,
    ] = await Promise.all([
      // Total invoices in period
      this.prisma.invoice.aggregate({
        where: {
          lease: { space: { property: { entityId } } },
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Total payments in period
      this.prisma.payment.aggregate({
        where: {
          invoice: { lease: { space: { property: { entityId } } } },
          paymentDate: { gte: start, lte: end },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Outstanding invoices
      this.prisma.invoice.aggregate({
        where: {
          lease: { space: { property: { entityId } } },
          status: { in: ['SENT', 'OVERDUE'] },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Overdue invoices
      this.prisma.invoice.aggregate({
        where: {
          lease: { space: { property: { entityId } } },
          status: 'OVERDUE',
          dueDate: { lt: new Date() },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Bank ledger totals
      this.prisma.bankLedger.aggregate({
        where: { entityId, isActive: true },
        _sum: { currentBalance: true },
        _count: true,
      }),

      // Monthly revenue breakdown
      this.prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', p."paymentDate") as month,
          SUM(p.amount) as revenue,
          COUNT(p.id) as payment_count
        FROM "payments" p
        INNER JOIN "invoices" i ON p."invoiceId" = i.id
        INNER JOIN "leases" l ON i."leaseId" = l.id
        INNER JOIN "spaces" s ON l."spaceId" = s.id
        INNER JOIN "properties" pr ON s."propertyId" = pr.id
        WHERE pr."entityId" = ${entityId}
          AND p."paymentDate" >= ${start}
          AND p."paymentDate" <= ${end}
          AND p.status = 'COMPLETED'
        GROUP BY DATE_TRUNC('month', p."paymentDate")
        ORDER BY month DESC
      `,
    ]);

    return {
      period: { startDate: start, endDate: end },
      invoices: {
        total: totalInvoices._sum.amount || 0,
        count: totalInvoices._count,
        outstanding: outstandingInvoices._sum.amount || 0,
        outstandingCount: outstandingInvoices._count,
        overdue: overdueInvoices._sum.amount || 0,
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
      monthlyRevenue,
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
        const outstanding = lease.invoices.reduce((invoiceSum, invoice) => invoiceSum + Number(invoice.amount), 0);
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
            leaseId: lease.id,
            invoiceNumber,
            invoiceType: 'RENT',
            amount: Number(lease.monthlyRent) + Number(lease.nnnExpenses || 0),
            dueDate,
            status: 'DRAFT',
            description: `Monthly rent for ${lease.space.property.name} - Unit ${lease.space.name}`,
            notes: 'Monthly rent invoice',
          },
          include: {
            lease: {
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
}