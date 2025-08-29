import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountType } from '@prisma/client';
import { CreateChartAccountDto, UpdateChartAccountDto } from '../dto/create-chart-account.dto';

@Injectable()
export class ChartAccountsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(entityId: string, dto: CreateChartAccountDto) {
        // Verify entity exists
        const entity = await this.prisma.entity.findUnique({
            where: { id: entityId },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        // Check for duplicate account code within entity
        const existingAccount = await this.prisma.chartAccount.findFirst({
            where: {
                entityId,
                accountCode: dto.accountCode,
            },
        });

        if (existingAccount) {
            throw new BadRequestException(`Account code ${dto.accountCode} already exists for this entity`);
        }

        // Validate parent account if provided
        if (dto.parentId) {
            const parentAccount = await this.prisma.chartAccount.findFirst({
                where: {
                    id: dto.parentId,
                    entityId,
                    isActive: true,
                },
            });

            if (!parentAccount) {
                throw new NotFoundException('Parent account not found or inactive');
            }

            // Ensure parent and child have compatible account types
            if (!this.isCompatibleAccountType(parentAccount.accountType as AccountType, dto.accountType)) {
                throw new BadRequestException('Incompatible account types for parent-child relationship');
            }
        }

        return this.prisma.chartAccount.create({
            data: {
                entityId,
                accountCode: dto.accountCode,
                accountName: dto.accountName,
                accountType: dto.accountType,
                parentId: dto.parentId,
                description: dto.description,
                isActive: true,
            },
            include: {
                entity: {
                    select: { id: true, name: true },
                },
                parent: {
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

        const accounts = await this.prisma.chartAccount.findMany({
            where: {
                entityId,
                ...(includeInactive ? {} : { isActive: true }),
            },
            include: {
                parent: {
                    select: {
                        id: true,
                        accountCode: true,
                        accountName: true,
                    },
                },
                children: {
                    where: includeInactive ? {} : { isActive: true },
                    select: {
                        id: true,
                        accountCode: true,
                        accountName: true,
                        accountType: true,
                        isActive: true,
                    },
                },
                _count: {
                    select: {
                        ledgerEntries: true,
                    },
                },
            },
            orderBy: {
                accountCode: 'asc',
            },
        });

        return this.buildAccountHierarchy(accounts);
    }

    async findOne(entityId: string, id: string) {
        const account = await this.prisma.chartAccount.findFirst({
            where: {
                id,
                entityId,
            },
            include: {
                entity: {
                    select: { id: true, name: true },
                },
                parent: {
                    select: {
                        id: true,
                        accountCode: true,
                        accountName: true,
                        accountType: true,
                    },
                },
                children: {
                    select: {
                        id: true,
                        accountCode: true,
                        accountName: true,
                        accountType: true,
                        isActive: true,
                    },
                },
                ledgerEntries: {
                    take: 10,
                    orderBy: {
                        transactionDate: 'desc',
                    },
                    select: {
                        id: true,
                        transactionType: true,
                        amount: true,
                        description: true,
                        transactionDate: true,
                        referenceNumber: true,
                    },
                },
                _count: {
                    select: {
                        ledgerEntries: true,
                    },
                },
            },
        });

        if (!account) {
            throw new NotFoundException('Chart account not found');
        }

        return account;
    }

    async update(entityId: string, id: string, dto: UpdateChartAccountDto) {
        const existingAccount = await this.prisma.chartAccount.findFirst({
            where: {
                id,
                entityId,
            },
        });

        if (!existingAccount) {
            throw new NotFoundException('Chart account not found');
        }

        return this.prisma.chartAccount.update({
            where: { id },
            data: {
                ...dto,
                updatedAt: new Date(),
            },
            include: {
                parent: {
                    select: {
                        id: true,
                        accountCode: true,
                        accountName: true,
                    },
                },
            },
        });
    }

    async deactivate(entityId: string, id: string) {
        const account = await this.prisma.chartAccount.findFirst({
            where: {
                id,
                entityId,
            },
            include: {
                children: {
                    where: { isActive: true },
                },
                _count: {
                    select: {
                        ledgerEntries: true,
                    },
                },
            },
        });

        if (!account) {
            throw new NotFoundException('Chart account not found');
        }

        // Check for active child accounts
        if (account.children.length > 0) {
            throw new BadRequestException('Cannot deactivate account with active child accounts');
        }

        // Note: We don't prevent deactivation if there are ledger entries
        // as this would preserve historical data but prevent new entries
        return this.prisma.chartAccount.update({
            where: { id },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
    }

    async getAccountsByType(entityId: string, accountType: AccountType) {
        return this.prisma.chartAccount.findMany({
            where: {
                entityId,
                accountType,
                isActive: true,
            },
            orderBy: {
                accountCode: 'asc',
            },
        });
    }

    // Helper method to build hierarchical structure
    private buildAccountHierarchy(accounts: any[]) {
        const accountMap = new Map();
        const rootAccounts = [];

        // First pass: create map of all accounts
        accounts.forEach(account => {
            accountMap.set(account.id, { ...account, children: [] });
        });

        // Second pass: build hierarchy
        accounts.forEach(account => {
            if (account.parentId) {
                const parent = accountMap.get(account.parentId);
                if (parent) {
                    parent.children.push(accountMap.get(account.id));
                }
            } else {
                rootAccounts.push(accountMap.get(account.id));
            }
        });

        return rootAccounts;
    }

    // Helper method to validate compatible account types
    private isCompatibleAccountType(parentType: string, childType: string): boolean {
        // Define rules for parent-child account type compatibility
        const compatibilityRules: Record<string, string[]> = {
            'ASSET': ['ASSET'],
            'LIABILITY': ['LIABILITY'],
            'EQUITY': ['EQUITY'],
            'REVENUE': ['REVENUE'],
            'EXPENSE': ['EXPENSE'],
        };

        return compatibilityRules[parentType]?.includes(childType) || false;
    }

    // Create default chart of accounts for a new entity
    async createDefaultChart(entityId: string) {
        const defaultAccounts = [
            // Assets
            { code: '1000', name: 'Current Assets', type: AccountType.ASSET, parent: null },
            { code: '1100', name: 'Cash and Cash Equivalents', type: AccountType.ASSET, parent: '1000' },
            { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, parent: '1000' },
            { code: '1300', name: 'Prepaid Expenses', type: AccountType.ASSET, parent: '1000' },
            { code: '1500', name: 'Fixed Assets', type: AccountType.ASSET, parent: null },
            { code: '1510', name: 'Property and Equipment', type: AccountType.ASSET, parent: '1500' },
            { code: '1520', name: 'Accumulated Depreciation', type: AccountType.ASSET, parent: '1500' },

            // Liabilities
            { code: '2000', name: 'Current Liabilities', type: AccountType.LIABILITY, parent: null },
            { code: '2100', name: 'Accounts Payable', type: AccountType.LIABILITY, parent: '2000' },
            { code: '2200', name: 'Accrued Expenses', type: AccountType.LIABILITY, parent: '2000' },
            { code: '2300', name: 'Security Deposits', type: AccountType.LIABILITY, parent: '2000' },
            { code: '2500', name: 'Long-term Liabilities', type: AccountType.LIABILITY, parent: null },
            { code: '2510', name: 'Mortgages Payable', type: AccountType.LIABILITY, parent: '2500' },

            // Equity
            { code: '3000', name: 'Owner\'s Equity', type: AccountType.EQUITY, parent: null },
            { code: '3100', name: 'Retained Earnings', type: AccountType.EQUITY, parent: '3000' },

            // Revenue
            { code: '4000', name: 'Revenue', type: AccountType.REVENUE, parent: null },
            { code: '4100', name: 'Rental Income', type: AccountType.REVENUE, parent: '4000' },
            { code: '4200', name: 'Late fees', type: AccountType.REVENUE, parent: '4000' },
            { code: '4300', name: 'Other Income', type: AccountType.REVENUE, parent: '4000' },

            // Expenses
            { code: '5000', name: 'Operating Expenses', type: AccountType.EXPENSE, parent: null },
            { code: '5100', name: 'Maintenance and Repairs', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5200', name: 'Utilities', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5300', name: 'Insurance', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5400', name: 'Property Taxes', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5500', name: 'Management Fees', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5600', name: 'Professional Services', type: AccountType.EXPENSE, parent: '5000' },
        ];

        const accountCodeMap = new Map();
        const createdAccounts = [];

        // First pass: create parent accounts
        for (const account of defaultAccounts.filter(a => !a.parent)) {
            const created = await this.prisma.chartAccount.create({
                data: {
                    entityId,
                    accountCode: account.code,
                    accountName: account.name,
                    accountType: account.type,
                    description: `Default ${account.name} account`,
                    isActive: true,
                },
            });
            accountCodeMap.set(account.code, created.id);
            createdAccounts.push(created);
        }

        // Second pass: create child accounts
        for (const account of defaultAccounts.filter(a => a.parent)) {
            const parentId = accountCodeMap.get(account.parent);
            const created = await this.prisma.chartAccount.create({
                data: {
                    entityId,
                    accountCode: account.code,
                    accountName: account.name,
                    accountType: account.type,
                    parentId,
                    description: `Default ${account.name} account`,
                    isActive: true,
                },
            });
            createdAccounts.push(created);
        }

        return createdAccounts;
    }
}