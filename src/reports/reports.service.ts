// src/reports/reports.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    // ============= P&L STATEMENTS =============

    async getProfitLossStatement(entityId: string, startDate: string, endDate: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get all revenue streams
        const [rentalIncome, lateFeesIncome, otherIncome, expenses] = await Promise.all([
            this.getRentalIncome(entityId, start, end),
            this.getLateFeesIncome(entityId, start, end),
            this.getOtherIncome(entityId, start, end),
            this.getExpensesByCategory(entityId, start, end),
        ]);

        const totalRevenue = rentalIncome + lateFeesIncome + otherIncome;
        const totalExpenses = Object.values(expenses).reduce((sum: number, amount: any) => sum + Number(amount), 0);
        const netIncome = totalRevenue - totalExpenses;

        return {
            entityId,
            period: { startDate: start, endDate: end },
            revenue: {
                rentalIncome,
                lateFeesIncome,
                otherIncome,
                totalRevenue,
            },
            expenses: {
                ...expenses,
                totalExpenses,
            },
            netIncome,
            profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
        };
    }

    // ============= OCCUPANCY ANALYTICS =============

    async getOccupancyAnalytics(entityId: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const [properties, monthlyOccupancy, yearlyTrends] = await Promise.all([
            this.getPropertyOccupancyStats(entityId),
            this.getMonthlyOccupancyTrends(entityId),
            this.getYearlyOccupancyTrends(entityId),
        ]);

        const totalUnits = properties.reduce((sum, prop) => sum + prop.totalUnits, 0);
        const occupiedUnits = properties.reduce((sum, prop) => sum + prop.occupiedUnits, 0);
        const overallOccupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

        return {
            entityId,
            summary: {
                totalProperties: properties.length,
                totalUnits,
                occupiedUnits,
                vacantUnits: totalUnits - occupiedUnits,
                overallOccupancyRate,
            },
            byProperty: properties,
            trends: {
                monthly: monthlyOccupancy,
                yearly: yearlyTrends,
            },
        };
    }

    // ============= CUSTOM REPORTS =============

    async getCustomReport(reportType: string, params: any, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        switch (reportType) {
            case 'rent-roll':
                return this.getRentRollReport(params.entityId, userRole, userOrgId, userEntities);
            case 'maintenance-summary':
                return this.getMaintenanceSummaryReport(params.entityId, params.startDate, params.endDate, userRole, userOrgId, userEntities);
            case 'lease-expiration':
                return this.getLeaseExpirationReport(params.entityId, params.months, userRole, userOrgId, userEntities);
            case 'financial-summary':
                return this.getFinancialSummaryReport(params.entityId, params.startDate, params.endDate, userRole, userOrgId, userEntities);
            case 'tenant-aging':
                return this.getTenantAgingReport(params.entityId, userRole, userOrgId, userEntities);
            default:
                throw new BadRequestException('Invalid report type');
        }
    }

    // ============= RENT ROLL REPORT =============

    async getRentRollReport(entityId: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const leases = await this.prisma.lease.findMany({
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
                },
            },
            orderBy: [
                { space: { property: { name: 'asc' } } },
                { space: { unitNumber: 'asc' } },
            ],
        });

        const summary = {
            totalUnits: leases.length,
            totalMonthlyRent: leases.reduce((sum, lease) => sum + Number(lease.monthlyRent), 0),
            totalAnnualRent: leases.reduce((sum, lease) => sum + Number(lease.monthlyRent) * 12, 0),
            totalOutstanding: leases.reduce((sum, lease) => {
                const outstanding = lease.invoices.reduce((invoiceSum, invoice) => invoiceSum + Number(invoice.amount), 0);
                return sum + outstanding;
            }, 0),
        };

        return { leases, summary };
    }

    // ============= MAINTENANCE SUMMARY REPORT =============

    async getMaintenanceSummaryReport(entityId: string, startDate: string, endDate: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const start = new Date(startDate);
        const end = new Date(endDate);

        const [requests, costs, byPriority, byProperty] = await Promise.all([
            this.getMaintenanceRequestStats(entityId, start, end),
            this.getMaintenanceCostStats(entityId, start, end),
            this.getMaintenanceByPriority(entityId, start, end),
            this.getMaintenanceByProperty(entityId, start, end),
        ]);

        return {
            entityId,
            period: { startDate: start, endDate: end },
            requests,
            costs,
            breakdown: {
                byPriority,
                byProperty,
            },
        };
    }

    // ============= LEASE EXPIRATION REPORT =============

    async getLeaseExpirationReport(entityId: string, months: number = 6, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + months);

        const expiringLeases = await this.prisma.lease.findMany({
            where: {
                space: { property: { entityId } },
                status: 'ACTIVE',
                endDate: { lte: futureDate },
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
            },
            orderBy: { endDate: 'asc' },
        });

        const summary = {
            totalExpiring: expiringLeases.length,
            totalMonthlyRentAtRisk: expiringLeases.reduce((sum, lease) => sum + Number(lease.monthlyRent), 0),
            averageDaysToExpiration: this.calculateAverageDaysToExpiration(expiringLeases),
        };

        return { expiringLeases, summary, lookAheadMonths: months };
    }

    // ============= FINANCIAL SUMMARY REPORT =============

    async getFinancialSummaryReport(entityId: string, startDate: string, endDate: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const start = new Date(startDate);
        const end = new Date(endDate);

        const [income, expenses, cashFlow, bankBalances] = await Promise.all([
            this.getIncomeBreakdown(entityId, start, end),
            this.getExpenseBreakdown(entityId, start, end),
            this.getCashFlowAnalysis(entityId, start, end),
            this.getBankBalances(entityId),
        ]);

        return {
            entityId,
            period: { startDate: start, endDate: end },
            income,
            expenses,
            cashFlow,
            bankBalances,
            netCashFlow: income.total - expenses.total,
        };
    }

    // ============= TENANT AGING REPORT =============

    async getTenantAgingReport(entityId: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const overdueInvoices = await this.prisma.invoice.findMany({
            where: {
                lease: { space: { property: { entityId } } },
                status: { in: ['SENT', 'OVERDUE'] },
                dueDate: { lt: new Date() },
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
                                phone: true,
                            },
                        },
                    },
                },
                payments: {
                    where: { status: 'COMPLETED' },
                },
            },
        });

        const agingBuckets = this.categorizeByAging(overdueInvoices);

        return {
            entityId,
            agingBuckets,
            summary: {
                totalOverdue: overdueInvoices.length,
                totalOverdueAmount: overdueInvoices.reduce((sum, invoice) => {
                    const paidAmount = invoice.payments.reduce((pSum, payment) => pSum + Number(payment.amount), 0);
                    return sum + (Number(invoice.amount) - paidAmount);
                }, 0),
            },
        };
    }

    // ============= HELPER METHODS =============

    private async getRentalIncome(entityId: string, start: Date, end: Date): Promise<number> {
        const payments = await this.prisma.payment.findMany({
            where: {
                invoice: {
                    lease: { space: { property: { entityId } } },
                    invoiceType: 'RENT',
                },
                paymentDate: { gte: start, lte: end },
                status: 'COMPLETED',
            },
        });

        return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    }

    private async getLateFeesIncome(entityId: string, start: Date, end: Date): Promise<number> {
        const payments = await this.prisma.payment.findMany({
            where: {
                invoice: {
                    lease: { space: { property: { entityId } } },
                    invoiceType: 'LATE_FEE',
                },
                paymentDate: { gte: start, lte: end },
                status: 'COMPLETED',
            },
        });

        return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    }

    private async getOtherIncome(entityId: string, start: Date, end: Date): Promise<number> {
        const payments = await this.prisma.payment.findMany({
            where: {
                invoice: {
                    lease: { space: { property: { entityId } } },
                    invoiceType: { in: ['UTILITIES', 'NNN', 'OTHER'] },
                },
                paymentDate: { gte: start, lte: end },
                status: 'COMPLETED',
            },
        });

        return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    }

    private async getExpensesByCategory(entityId: string, start: Date, end: Date) {
        const expenses = await this.prisma.propertyExpense.findMany({
            where: {
                property: { entityId },
                expenseDate: { gte: start, lte: end },
            },
        });

        const categorized = {
            maintenance: 0,
            utilities: 0,
            insurance: 0,
            taxes: 0,
            management: 0,
            repairs: 0,
            landscaping: 0,
            cleaning: 0,
            other: 0,
        };

        expenses.forEach(expense => {
            const category = expense.expenseType.toLowerCase();
            if (category in categorized) {
                categorized[category as keyof typeof categorized] += Number(expense.amount);
            } else {
                categorized.other += Number(expense.amount);
            }
        });

        return categorized;
    }

    private async getPropertyOccupancyStats(entityId: string) {
        const properties = await this.prisma.property.findMany({
            where: { entityId },
            include: {
                spaces: {
                    include: {
                        leases: {
                            where: { status: 'ACTIVE' },
                        },
                    },
                },
            },
        });

        return properties.map(property => {
            const totalUnits = property.spaces.length;
            const occupiedUnits = property.spaces.filter(space => space.leases.length > 0).length;
            const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

            return {
                propertyId: property.id,
                propertyName: property.name,
                totalUnits,
                occupiedUnits,
                vacantUnits: totalUnits - occupiedUnits,
                occupancyRate,
            };
        });
    }

    private async getMonthlyOccupancyTrends(entityId: string) {
        const monthsBack = 12;
        const trends = [];

        for (let i = 0; i < monthsBack; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const occupancyData = await this.getOccupancyForPeriod(entityId, startOfMonth, endOfMonth);
            trends.unshift({
                month: startOfMonth.toISOString().substring(0, 7),
                ...occupancyData,
            });
        }

        return trends;
    }

    private async getYearlyOccupancyTrends(entityId: string) {
        const yearsBack = 3;
        const trends = [];

        for (let i = 0; i < yearsBack; i++) {
            const year = new Date().getFullYear() - i;
            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31);

            const occupancyData = await this.getOccupancyForPeriod(entityId, startOfYear, endOfYear);
            trends.unshift({
                year,
                ...occupancyData,
            });
        }

        return trends;
    }

    private async getOccupancyForPeriod(entityId: string, start: Date, end: Date) {
        const [totalSpaces, activeLeases] = await Promise.all([
            this.prisma.space.count({
                where: { property: { entityId } },
            }),
            this.prisma.lease.count({
                where: {
                    space: { property: { entityId } },
                    status: 'ACTIVE',
                    startDate: { lte: end },
                    endDate: { gte: start },
                },
            }),
        ]);

        return {
            totalUnits: totalSpaces,
            occupiedUnits: activeLeases,
            occupancyRate: totalSpaces > 0 ? (activeLeases / totalSpaces) * 100 : 0,
        };
    }

    private async getMaintenanceRequestStats(entityId: string, start: Date, end: Date) {
        const [total, open, inProgress, completed, cancelled] = await Promise.all([
            this.prisma.maintenanceRequest.count({
                where: {
                    property: { entityId },
                    requestedAt: { gte: start, lte: end },
                },
            }),
            this.prisma.maintenanceRequest.count({
                where: {
                    property: { entityId },
                    requestedAt: { gte: start, lte: end },
                    status: 'OPEN',
                },
            }),
            this.prisma.maintenanceRequest.count({
                where: {
                    property: { entityId },
                    requestedAt: { gte: start, lte: end },
                    status: 'IN_PROGRESS',
                },
            }),
            this.prisma.maintenanceRequest.count({
                where: {
                    property: { entityId },
                    requestedAt: { gte: start, lte: end },
                    status: 'COMPLETED',
                },
            }),
            this.prisma.maintenanceRequest.count({
                where: {
                    property: { entityId },
                    requestedAt: { gte: start, lte: end },
                    status: 'CANCELLED',
                },
            }),
        ]);

        return { total, open, inProgress, completed, cancelled };
    }

    private async getMaintenanceCostStats(entityId: string, start: Date, end: Date) {
        const costs = await this.prisma.maintenanceRequest.aggregate({
            where: {
                property: { entityId },
                requestedAt: { gte: start, lte: end },
                actualCost: { not: null },
            },
            _sum: { actualCost: true },
            _avg: { actualCost: true },
            _count: { actualCost: true },
        });

        return {
            total: costs._sum.actualCost || 0,
            average: costs._avg.actualCost || 0,
            count: costs._count.actualCost,
        };
    }

    private async getMaintenanceByPriority(entityId: string, start: Date, end: Date) {
        const priorities = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];
        const results = {};

        for (const priority of priorities) {
            const count = await this.prisma.maintenanceRequest.count({
                where: {
                    property: { entityId },
                    requestedAt: { gte: start, lte: end },
                    priority: priority as any,
                },
            });
            results[priority.toLowerCase()] = count;
        }

        return results;
    }

    private async getMaintenanceByProperty(entityId: string, start: Date, end: Date) {
        const stats = await this.prisma.maintenanceRequest.groupBy({
            by: ['propertyId'],
            where: {
                property: { entityId },
                requestedAt: { gte: start, lte: end },
            },
            _count: { id: true },
        });

        const propertyIds = stats.map(stat => stat.propertyId);
        const properties = await this.prisma.property.findMany({
            where: { id: { in: propertyIds } },
            select: { id: true, name: true },
        });

        return stats.map(stat => {
            const property = properties.find(p => p.id === stat.propertyId);
            return {
                propertyId: stat.propertyId,
                propertyName: property?.name || 'Unknown',
                requestCount: stat._count.id,
            };
        });
    }

    private calculateAverageDaysToExpiration(leases: any[]): number {
        if (leases.length === 0) return 0;

        const now = new Date();
        const totalDays = leases.reduce((sum, lease) => {
            const daysToExpiration = Math.ceil((new Date(lease.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return sum + daysToExpiration;
        }, 0);

        return Math.round(totalDays / leases.length);
    }

    private async getIncomeBreakdown(entityId: string, start: Date, end: Date) {
        const [rental, lateFees, other] = await Promise.all([
            this.getRentalIncome(entityId, start, end),
            this.getLateFeesIncome(entityId, start, end),
            this.getOtherIncome(entityId, start, end),
        ]);

        return {
            rental,
            lateFees,
            other,
            total: rental + lateFees + other,
        };
    }

    private async getExpenseBreakdown(entityId: string, start: Date, end: Date) {
        const expenses = await this.getExpensesByCategory(entityId, start, end);
        const total = Object.values(expenses).reduce((sum: number, amount: any) => sum + Number(amount), 0);

        return { ...expenses, total };
    }

    private async getCashFlowAnalysis(entityId: string, start: Date, end: Date) {
        const [income, expenses] = await Promise.all([
            this.getIncomeBreakdown(entityId, start, end),
            this.getExpenseBreakdown(entityId, start, end),
        ]);

        return {
            netCashFlow: income.total - expenses.total,
            operatingCashFlow: income.rental - expenses.total,
            cashFlowMargin: income.total > 0 ? ((income.total - expenses.total) / income.total) * 100 : 0,
        };
    }

    private async getBankBalances(entityId: string) {
        const bankLedgers = await this.prisma.bankLedger.findMany({
            where: { entityId, isActive: true },
            select: {
                id: true,
                accountName: true,
                currentBalance: true,
                accountType: true,
            },
        });

        const totalBalance = bankLedgers.reduce((sum, ledger) => sum + Number(ledger.currentBalance), 0);

        return {
            accounts: bankLedgers,
            totalBalance,
        };
    }

    private categorizeByAging(invoices: any[]) {
        const now = new Date();
        const buckets = {
            current: [],
            thirtyDays: [],
            sixtyDays: [],
            ninetyDays: [],
            overNinety: [],
        };

        invoices.forEach(invoice => {
            const daysOverdue = Math.ceil((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
            const paidAmount = invoice.payments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0);
            const outstandingAmount = Number(invoice.amount) - paidAmount;

            const invoiceData = {
                ...invoice,
                daysOverdue,
                outstandingAmount,
            };

            if (daysOverdue <= 0) {
                buckets.current.push(invoiceData);
            } else if (daysOverdue <= 30) {
                buckets.thirtyDays.push(invoiceData);
            } else if (daysOverdue <= 60) {
                buckets.sixtyDays.push(invoiceData);
            } else if (daysOverdue <= 90) {
                buckets.ninetyDays.push(invoiceData);
            } else {
                buckets.overNinety.push(invoiceData);
            }
        });

        return buckets;
    }

    private async verifyEntityAccess(entityId: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        const entity = await this.prisma.entity.findUnique({
            where: { id: entityId },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && entity.organizationId !== userOrgId) {
                throw new ForbiddenException('No access to this entity');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(entityId)) {
                throw new ForbiddenException('No access to this entity');
            }
        }

        return entity;
    }
}