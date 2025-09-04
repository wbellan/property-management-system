// src/reports/reports.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    // ============= PROFIT & LOSS STATEMENTS =============

    async getProfitLossStatement(
        entityId: string,
        startDate: string,
        endDate: string,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[],
    ) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get revenue data from payment applications
        const revenue = await this.prisma.paymentApplication.aggregate({
            where: {
                payment: {
                    createdAt: {
                        gte: start,
                        lte: end,
                    },
                },
                invoice: {
                    lease: {
                        space: {
                            property: {
                                entityId,
                            },
                        },
                    },
                },
            },
            _sum: {
                appliedAmount: true,
            },
        });

        // Get expense data - using createdAt instead of date
        const expenses = await this.prisma.propertyExpense.aggregate({
            where: {
                property: {
                    entityId,
                },
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            _sum: {
                amount: true,
            },
        });

        // Convert Decimal to number properly
        const totalRevenue = Number(revenue._sum.appliedAmount || 0);
        const totalExpenses = Number(expenses._sum.amount || 0);
        const netIncome = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

        return {
            entityId,
            period: {
                startDate,
                endDate,
            },
            summary: {
                totalRevenue,
                totalExpenses,
                netIncome,
                profitMargin: Math.round(profitMargin * 100) / 100,
            },
            revenue: {
                total: totalRevenue,
            },
            expenses: {
                total: totalExpenses,
            },
            generatedAt: new Date(),
        };
    }

    // ============= OCCUPANCY ANALYTICS =============

    async getOccupancyAnalytics(
        entityId: string,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[],
    ) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        // Get all spaces for the entity
        const spaces = await this.prisma.space.findMany({
            where: {
                property: {
                    entityId,
                },
            },
            include: {
                property: {
                    select: {
                        id: true,
                        name: true,
                        propertyType: true,
                    },
                },
                leases: {
                    where: {
                        status: 'ACTIVE',
                    },
                    select: {
                        id: true,
                        monthlyRent: true,
                        startDate: true,
                        endDate: true,
                    },
                },
            },
        });

        const totalSpaces = spaces.length;
        const occupiedSpaces = spaces.filter(space => space.leases.length > 0).length;
        const vacantSpaces = totalSpaces - occupiedSpaces;
        const occupancyRate = totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0;

        // Calculate monthly revenue from occupied spaces
        const monthlyRevenue = spaces.reduce((sum, space) => {
            if (space.leases.length > 0) {
                return sum + Number(space.leases[0].monthlyRent || 0);
            }
            return sum;
        }, 0);

        // Group by property
        const propertySummary = spaces.reduce((acc, space) => {
            const propertyId = space.property.id;
            if (!acc[propertyId]) {
                acc[propertyId] = {
                    propertyId,
                    propertyName: space.property.name,
                    propertyType: space.property.propertyType,
                    totalSpaces: 0,
                    occupiedSpaces: 0,
                    vacantSpaces: 0,
                    occupancyRate: 0,
                    monthlyRevenue: 0,
                };
            }

            acc[propertyId].totalSpaces++;
            if (space.leases.length > 0) {
                acc[propertyId].occupiedSpaces++;
                acc[propertyId].monthlyRevenue += Number(space.leases[0]?.monthlyRent || 0);
            } else {
                acc[propertyId].vacantSpaces++;
            }

            acc[propertyId].occupancyRate = acc[propertyId].totalSpaces > 0 ?
                (acc[propertyId].occupiedSpaces / acc[propertyId].totalSpaces) * 100 : 0;

            return acc;
        }, {});

        return {
            entityId,
            summary: {
                totalSpaces,
                occupiedSpaces,
                vacantSpaces,
                occupancyRate: Math.round(occupancyRate * 100) / 100,
                monthlyRevenue,
                annualRevenue: monthlyRevenue * 12,
            },
            properties: Object.values(propertySummary),
            generatedAt: new Date(),
        };
    }

    // ============= ENHANCED CASH FLOW ANALYSIS =============

    async getCashFlowAnalysis(
        entityId: string,
        startDate: string,
        endDate: string,
        groupBy: 'month' | 'quarter' | 'year',
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[]
    ) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get income for the period
        const income = await this.getIncomeForPeriod(entityId, start, end);

        // Get expenses for the period
        const expenses = await this.getExpensesForPeriod(entityId, start, end);

        const netCashFlow = income.total - expenses.total;

        return {
            entityId,
            period: { startDate: start, endDate: end },
            groupBy,
            summary: {
                totalIncome: income.total,
                totalExpenses: expenses.total,
                netCashFlow,
                cashFlowMargin: income.total > 0 ? (netCashFlow / income.total) * 100 : 0,
            },
            generatedAt: new Date(),
        };
    }

    // ============= ENHANCED RENT ROLL REPORT =============

    async getEnhancedRentRollReport(
        entityId: string,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[],
        propertyId?: string,
        includeVacant: boolean = false
    ) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        let whereClause: any = {
            property: { entityId },
        };

        if (propertyId) {
            whereClause.propertyId = propertyId;
        }

        // Get all spaces that match criteria
        const spaces = await this.prisma.space.findMany({
            where: whereClause,
            include: {
                property: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        propertyType: true,
                    },
                },
                leases: {
                    where: {
                        status: 'ACTIVE',
                    },
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
                    },
                },
            },
            orderBy: [
                { property: { name: 'asc' } },
                { name: 'asc' },
            ],
        });

        // Filter for occupied or include vacant based on parameter
        const filteredSpaces = includeVacant ?
            spaces :
            spaces.filter(space => space.leases.length > 0);

        const rentRoll = filteredSpaces.map(space => {
            const activeLease = space.leases[0];

            return {
                spaceId: space.id,
                spaceName: space.name,
                propertyId: space.property.id,
                propertyName: space.property.name,
                propertyAddress: space.property.address,
                propertyType: space.property.propertyType,
                squareFootage: Number(space.squareFootage),
                status: activeLease ? 'OCCUPIED' : 'VACANT',
                tenant: activeLease ? {
                    id: activeLease.tenant.id,
                    name: `${activeLease.tenant.firstName} ${activeLease.tenant.lastName}`,
                    email: activeLease.tenant.email,
                    phone: activeLease.tenant.phone,
                } : null,
                lease: activeLease ? {
                    id: activeLease.id,
                    startDate: activeLease.startDate,
                    endDate: activeLease.endDate,
                    monthlyRent: activeLease.monthlyRent,
                    securityDeposit: activeLease.securityDeposit,
                } : null,
            };
        });

        const summary = {
            totalSpaces: rentRoll.length,
            occupiedSpaces: rentRoll.filter(r => r.status === 'OCCUPIED').length,
            vacantSpaces: rentRoll.filter(r => r.status === 'VACANT').length,
            totalMonthlyRent: rentRoll.reduce((sum, r) => sum + Number(r.lease?.monthlyRent || 0), 0),
        };

        return {
            entityId,
            propertyId,
            includeVacant,
            summary,
            rentRoll,
            generatedAt: new Date(),
        };
    }

    // ============= ENHANCED LEASE EXPIRATION REPORT =============

    async getEnhancedLeaseExpirationReport(
        entityId: string,
        months: number,
        includeRenewalHistory: boolean,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[]
    ) {
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

        // Calculate risk scores and categorize leases
        const leasesWithAnalysis = expiringLeases.map(lease => {
            const daysUntilExpiration = Math.floor(
                (lease.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
            if (daysUntilExpiration <= 30) riskLevel = 'CRITICAL';
            else if (daysUntilExpiration <= 60) riskLevel = 'HIGH';
            else if (daysUntilExpiration <= 90) riskLevel = 'MEDIUM';
            else riskLevel = 'LOW';

            return {
                leaseId: lease.id,
                tenant: {
                    name: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
                    email: lease.tenant.email,
                    phone: lease.tenant.phone,
                },
                property: {
                    id: lease.space.property.id,
                    name: lease.space.property.name,
                    address: lease.space.property.address,
                },
                space: {
                    id: lease.space.id,
                    name: lease.space.name,
                },
                leaseDetails: {
                    startDate: lease.startDate,
                    endDate: lease.endDate,
                    monthlyRent: lease.monthlyRent,
                    securityDeposit: lease.securityDeposit,
                },
                expirationAnalysis: {
                    daysUntilExpiration,
                    riskLevel,
                    renewalRecommendation: daysUntilExpiration <= 60 ?
                        'Contact immediately for renewal discussion' :
                        'Schedule renewal discussion',
                },
            };
        });

        // Group by risk level
        const riskSummary = leasesWithAnalysis.reduce((acc, lease) => {
            const risk = lease.expirationAnalysis.riskLevel;
            acc[risk] = (acc[risk] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const summary = {
            totalExpiringLeases: leasesWithAnalysis.length,
            totalMonthlyRentAtRisk: leasesWithAnalysis.reduce(
                (sum, lease) => sum + Number(lease.leaseDetails.monthlyRent), 0
            ),
            riskBreakdown: riskSummary,
        };

        return {
            entityId,
            lookAheadMonths: months,
            includeRenewalHistory,
            summary,
            expiringLeases: leasesWithAnalysis,
            generatedAt: new Date(),
        };
    }

    // ============= MAINTENANCE ANALYTICS =============

    async getMaintenanceAnalytics(
        entityId: string,
        startDate: string,
        endDate: string,
        propertyId: string | undefined,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[]
    ) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const start = new Date(startDate);
        const end = new Date(endDate);

        let whereClause: any = {
            property: { entityId },
            createdAt: { gte: start, lte: end },
        };

        if (propertyId) {
            whereClause.propertyId = propertyId;
        }

        const maintenanceRequests = await this.prisma.maintenanceRequest.findMany({
            where: whereClause,
            include: {
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
        });

        const totalRequests = maintenanceRequests.length;
        const completedRequests = maintenanceRequests.filter(r => r.status === 'COMPLETED').length;
        const pendingRequests = totalRequests - completedRequests;

        // Group by priority
        const requestsByPriority = maintenanceRequests.reduce((acc, req) => {
            acc[req.priority] = (acc[req.priority] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Group by title (instead of category which doesn't exist)
        const requestsByType = maintenanceRequests.reduce((acc, req) => {
            const type = req.title || 'Other';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            entityId,
            propertyId,
            period: { startDate: start, endDate: end },
            summary: {
                totalRequests,
                completedRequests,
                pendingRequests,
                completionRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0,
            },
            breakdowns: {
                byPriority: requestsByPriority,
                byType: requestsByType,
            },
            generatedAt: new Date(),
        };
    }

    // ============= TENANT ANALYTICS =============

    async getTenantAnalytics(
        entityId: string,
        includePaymentHistory: boolean,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[]
    ) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const tenantLeases = await this.prisma.lease.findMany({
            where: {
                space: { property: { entityId } },
                status: 'ACTIVE',
            },
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
                rentPayments: includePaymentHistory ? {
                    orderBy: { paymentDate: 'desc' },
                } : {
                    orderBy: { paymentDate: 'desc' },
                    take: 3,
                },
            },
        });

        const tenantAnalytics = tenantLeases.map(lease => {
            const payments = lease.rentPayments || [];
            const totalPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

            // Calculate late payments based on payment status instead of isLate field
            const latePayments = payments.filter(payment => payment.status === 'PENDING' || payment.status === 'FAILED').length;
            const onTimeRate = payments.length > 0 ?
                ((payments.length - latePayments) / payments.length) * 100 : 100;

            return {
                tenantId: lease.tenant.id,
                tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
                email: lease.tenant.email,
                phone: lease.tenant.phone,
                property: {
                    id: lease.space.property.id,
                    name: lease.space.property.name,
                    address: lease.space.property.address,
                },
                space: {
                    id: lease.space.id,
                    name: lease.space.name,
                },
                lease: {
                    id: lease.id,
                    monthlyRent: lease.monthlyRent,
                    startDate: lease.startDate,
                    endDate: lease.endDate,
                },
                paymentMetrics: {
                    totalPayments,
                    latePayments,
                    onTimePaymentRate: Math.round(onTimeRate * 100) / 100,
                    paymentHistory: includePaymentHistory ? payments : payments.slice(0, 3),
                },
            };
        });

        const summary = {
            totalTenants: tenantAnalytics.length,
            averageOnTimeRate: tenantAnalytics.length > 0 ?
                tenantAnalytics.reduce((sum, t) => sum + t.paymentMetrics.onTimePaymentRate, 0) / tenantAnalytics.length : 0,
            totalMonthlyRent: tenantAnalytics.reduce((sum, t) => sum + Number(t.lease.monthlyRent), 0),
        };

        return {
            entityId,
            includePaymentHistory,
            summary,
            tenants: tenantAnalytics,
            generatedAt: new Date(),
        };
    }

    // ============= PORTFOLIO OVERVIEW =============

    async getPortfolioOverview(
        entityId: string,
        includeProjections: boolean,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[]
    ) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const properties = await this.prisma.property.findMany({
            where: { entityId },
            include: {
                spaces: {
                    include: {
                        leases: {
                            where: { status: 'ACTIVE' },
                            select: {
                                monthlyRent: true,
                                securityDeposit: true,
                            },
                        },
                    },
                },
            },
        });

        const portfolioMetrics = properties.map(property => {
            const totalSpaces = property.spaces.length;
            const occupiedSpaces = property.spaces.filter(space => space.leases.length > 0).length;
            const monthlyRevenue = property.spaces.reduce((sum, space) =>
                sum + Number(space.leases[0]?.monthlyRent || 0), 0
            );

            return {
                propertyId: property.id,
                propertyName: property.name,
                address: property.address,
                propertyType: property.propertyType,
                totalSpaces,
                occupiedSpaces,
                vacantSpaces: totalSpaces - occupiedSpaces,
                occupancyRate: totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0,
                monthlyRevenue,
                annualRevenue: monthlyRevenue * 12,
            };
        });

        const portfolioSummary = {
            totalProperties: properties.length,
            totalSpaces: portfolioMetrics.reduce((sum, p) => sum + p.totalSpaces, 0),
            totalOccupiedSpaces: portfolioMetrics.reduce((sum, p) => sum + p.occupiedSpaces, 0),
            totalVacantSpaces: portfolioMetrics.reduce((sum, p) => sum + p.vacantSpaces, 0),
            averageOccupancyRate: portfolioMetrics.length > 0 ?
                portfolioMetrics.reduce((sum, p) => sum + p.occupancyRate, 0) / portfolioMetrics.length : 0,
            totalMonthlyRevenue: portfolioMetrics.reduce((sum, p) => sum + p.monthlyRevenue, 0),
            totalAnnualRevenue: portfolioMetrics.reduce((sum, p) => sum + p.annualRevenue, 0),
        };

        return {
            entityId,
            includeProjections,
            summary: portfolioSummary,
            properties: portfolioMetrics,
            projections: includeProjections ? this.generateSimpleProjections(portfolioSummary) : null,
            generatedAt: new Date(),
        };
    }

    // ============= CUSTOM REPORT GENERATION =============

    async generateCustomReport(
        reportParams: any,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[]
    ) {
        await this.verifyEntityAccess(reportParams.entityId, userRole, userOrgId, userEntities);

        return {
            reportType: reportParams.reportType,
            entityId: reportParams.entityId,
            parameters: reportParams,
            message: 'Custom report generation - basic implementation',
            generatedAt: new Date(),
        };
    }

    // ============= COMPARATIVE ANALYSIS =============

    async getComparativeAnalysis(
        entityId: string,
        compareType: 'properties' | 'periods',
        startDate: string,
        endDate: string,
        propertyIds: string[] | undefined,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[]
    ) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        return {
            entityId,
            compareType,
            period: { startDate, endDate },
            propertyIds,
            message: 'Comparative analysis - basic implementation',
            generatedAt: new Date(),
        };
    }

    // ============= EXPORT FUNCTIONALITY =============

    async exportReport(
        reportType: string,
        entityId: string,
        format:'json' | 'csv' | 'html' | 'pdf' = 'csv',
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[],
        startDate?: string,
        endDate?: string
    ) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        let reportData: any;

        switch (reportType) {
            case 'rent-roll':
                reportData = await this.getEnhancedRentRollReport(entityId, userRole, userOrgId, userEntities);
                break;
            case 'profit-loss':
                if (!startDate || !endDate) throw new BadRequestException('Start and end dates required');
                reportData = await this.getProfitLossStatement(entityId, startDate, endDate, userRole, userOrgId, userEntities);
                break;
            default:
                throw new BadRequestException(`Export not supported for report type: ${reportType}`);
        }

        return {
            reportType,
            entityId,
            format,
            data: reportData,
            generatedAt: new Date(),
        };
    }

    // ============= SCHEDULED REPORTS =============

    async scheduleReport(
        scheduleParams: any,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[]
    ) {
        await this.verifyEntityAccess(scheduleParams.entityId, userRole, userOrgId, userEntities);

        return {
            scheduleId: `schedule_${Date.now()}`,
            ...scheduleParams,
            status: 'scheduled',
            createdAt: new Date(),
        };
    }

    // ============= DASHBOARD METRICS =============

    // SUPER_ADMIN & ORG_ADMIN Dashboard
    async getAdminDashboard(
        organizationId: string,
        userRole: UserRole,
        userOrgId: string,
        userEntityIds: string[]
    ) {
        // Use existing organization-wide dashboard logic
        return this.getOrganizationDashboardMetrics(organizationId, userRole, userOrgId, userEntityIds);
    }

    async getOrganizationDashboardMetrics(
        organizationId: string,
        userRole: UserRole,
        userOrgId: string,
        userEntityIds: string[]
    ) {
        // Get all entities for this organization that user can access
        let entityFilter: any = { organizationId };

        if (userRole === UserRole.ENTITY_MANAGER) {
            entityFilter.id = { in: userEntityIds };
        }

        const entities = await this.prisma.entity.findMany({
            where: entityFilter,
            select: { id: true }
        });

        const accessibleEntityIds = entities.map(e => e.id);

        // Get occupancy across all accessible entities
        const allSpaces = await this.prisma.space.findMany({
            where: {
                property: {
                    entityId: { in: accessibleEntityIds }
                }
            },
            include: {
                leases: {
                    where: { status: 'ACTIVE' },
                    select: { monthlyRent: true }
                }
            }
        });

        const totalSpaces = allSpaces.length;
        const occupiedSpaces = allSpaces.filter(space => space.leases.length > 0).length;
        const occupancyRate = totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0;

        // Get financial data across all accessible entities
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Get all active leases and filter in application logic
        const currentMonthLeases = await this.prisma.lease.findMany({
            where: {
                space: {
                    property: {
                        entityId: { in: accessibleEntityIds }
                    }
                },
                status: 'ACTIVE',
                startDate: { lte: endOfMonth }
            },
            select: {
                id: true,
                monthlyRent: true,
                startDate: true,
                endDate: true,
            }
        });

        // Filter in JavaScript to handle nullable endDate
        const activeInCurrentMonth = currentMonthLeases.filter(lease => {
            // Include if no end date (ongoing) or end date is after month start
            return !lease.endDate || lease.endDate >= startOfMonth;
        });

        // Calculate prorated revenue for partial months
        let currentMonthRevenue = 0;
        const daysInMonth = endOfMonth.getDate();

        activeInCurrentMonth.forEach(lease => {
            const leaseStart = lease.startDate > startOfMonth ? lease.startDate : startOfMonth;
            const leaseEnd = lease.endDate && lease.endDate < endOfMonth ? lease.endDate : endOfMonth;

            const daysActive = Math.ceil((leaseEnd.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const proratedAmount = (Number(lease.monthlyRent) / daysInMonth) * daysActive;

            currentMonthRevenue += proratedAmount;
        });

        // Get maintenance across all accessible entities
        const maintenanceStats = await Promise.all([
            // Get by status
            this.prisma.maintenanceRequest.groupBy({
                by: ['status'],
                where: {
                    property: {
                        entityId: { in: accessibleEntityIds }
                    }
                },
                _count: true
            }),
            // Get by priority
            this.prisma.maintenanceRequest.groupBy({
                by: ['priority'],
                where: {
                    property: {
                        entityId: { in: accessibleEntityIds }
                    }
                },
                _count: true
            })
        ]);

        const [statusStats, priorityStats] = maintenanceStats;

        // Get expiring leases across all accessible entities
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 1);

        const expiringLeases = await this.prisma.lease.count({
            where: {
                space: {
                    property: {
                        entityId: { in: accessibleEntityIds }
                    }
                },
                status: 'ACTIVE',
                endDate: { lte: futureDate }
            }
        });

        return {
            organizationId,
            accessibleEntities: accessibleEntityIds.length,
            occupancy: {
                rate: Math.round(occupancyRate * 100) / 100,
                totalSpaces,
                occupiedSpaces,
            },
            financial: {
                monthlyRevenue: Math.round(currentMonthRevenue * 100) / 100
            },
            maintenance: {
                openTasks: statusStats.find(s => s.status === 'OPEN')?._count || 0,
                inProgress: statusStats.find(s => s.status === 'IN_PROGRESS')?._count || 0,
                completed: statusStats.find(s => s.status === 'COMPLETED')?._count || 0,
                emergency: priorityStats.find(p => p.priority === 'EMERGENCY')?._count || 0,
                high: priorityStats.find(p => p.priority === 'HIGH')?._count || 0,
                medium: priorityStats.find(p => p.priority === 'MEDIUM')?._count || 0,
                low: priorityStats.find(p => p.priority === 'LOW')?._count || 0,
            },
            leases: {
                expiring: expiringLeases,
            },
            generatedAt: new Date(),
        };
    }

    // ENTITY_MANAGER Dashboard
    async getEntityManagerDashboard(organizationId: string, entityIds: string[]) {
        const occupancyData = await this.getEntityOccupancyMetrics(entityIds);
        const financialData = await this.getEntityFinancialMetrics(entityIds);
        const maintenanceData = await this.getEntityMaintenanceMetrics(entityIds);
        const leaseData = await this.getEntityLeaseMetrics(entityIds);

        return {
            dashboardType: 'ENTITY_MANAGER',
            organizationId,
            accessibleEntities: entityIds.length,
            occupancy: occupancyData,
            financial: financialData,
            maintenance: maintenanceData,
            leases: leaseData,
            generatedAt: new Date(),
        };
    }

    // PROPERTY_MANAGER Dashboard
    async getPropertyManagerDashboard(propertyIds: string[]) {
        if (propertyIds.length === 0) {
            return this.getEmptyDashboard('PROPERTY_MANAGER');
        }

        const properties = await this.prisma.property.findMany({
            where: { id: { in: propertyIds } },
            include: {
                spaces: {
                    include: {
                        leases: { where: { status: 'ACTIVE' } }
                    }
                }
            }
        });

        const totalSpaces = properties.reduce((sum, p) => sum + p.spaces.length, 0);
        const occupiedSpaces = properties.reduce((sum, p) =>
            sum + p.spaces.filter(s => s.leases.length > 0).length, 0
        );

        const monthlyRevenue = properties.reduce((sum, p) =>
            sum + p.spaces.reduce((spaceSum, s) =>
                spaceSum + (s.leases[0]?.monthlyRent ? Number(s.leases[0].monthlyRent) : 0), 0
            ), 0
        );

        const maintenanceStats = await this.prisma.maintenanceRequest.groupBy({
            by: ['status', 'priority'],
            where: { propertyId: { in: propertyIds } },
            _count: true
        });

        const upcomingLeaseExpirations = await this.prisma.lease.count({
            where: {
                space: { propertyId: { in: propertyIds } },
                status: 'ACTIVE',
                endDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
            }
        });

        return {
            dashboardType: 'PROPERTY_MANAGER',
            assignedProperties: properties.length,
            occupancy: {
                rate: totalSpaces > 0 ? Math.round((occupiedSpaces / totalSpaces) * 10000) / 100 : 0,
                totalSpaces,
                occupiedSpaces,
            },
            financial: { monthlyRevenue },
            maintenance: {
                openTasks: maintenanceStats.filter(s => s.status === 'OPEN').reduce((sum, s) => sum + s._count, 0),
                emergency: maintenanceStats.filter(s => s.priority === 'EMERGENCY').reduce((sum, s) => sum + s._count, 0),
            },
            leases: { expiring: upcomingLeaseExpirations },
            properties: properties.map(p => ({
                id: p.id,
                name: p.name,
                totalSpaces: p.spaces.length,
                occupiedSpaces: p.spaces.filter(s => s.leases.length > 0).length,
                monthlyRevenue: p.spaces.reduce((sum, s) =>
                    sum + (s.leases[0]?.monthlyRent ? Number(s.leases[0].monthlyRent) : 0), 0
                )
            })),
            generatedAt: new Date(),
        };
    }

    // ACCOUNTANT Dashboard
    async getAccountantDashboard(organizationId: string, entityIds: string[]) {
        const currentMonth = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const [revenue, expenses, outstandingInvoices, recentPayments] = await Promise.all([
            this.prisma.paymentApplication.aggregate({
                where: {
                    payment: {
                        createdAt: { gte: lastMonth, lte: currentMonth },
                    },
                    invoice: {
                        lease: {
                            space: {
                                property: { entityId: { in: entityIds } }
                            }
                        }
                    }
                },
                _sum: { appliedAmount: true }
            }),
            this.prisma.propertyExpense.aggregate({
                where: {
                    property: { entityId: { in: entityIds } },
                    createdAt: { gte: lastMonth, lte: currentMonth }
                },
                _sum: { amount: true }
            }),
            this.prisma.invoice.count({
                where: {
                    status: 'SENT',
                    lease: {
                        space: {
                            property: { entityId: { in: entityIds } }
                        }
                    }
                }
            }),
            this.prisma.payment.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                    paymentApplications: {
                        some: {
                            invoice: {
                                lease: {
                                    space: {
                                        property: { entityId: { in: entityIds } }
                                    }
                                }
                            }
                        }
                    }
                }
            })
        ]);

        return {
            dashboardType: 'ACCOUNTANT',
            organizationId,
            financial: {
                monthlyRevenue: Number(revenue._sum.appliedAmount || 0),
                monthlyExpenses: Number(expenses._sum.amount || 0),
                netIncome: Number(revenue._sum.appliedAmount || 0) - Number(expenses._sum.amount || 0),
                outstandingInvoices,
                recentPayments,
            },
            generatedAt: new Date(),
        };
    }

    // MAINTENANCE Dashboard
    async getMaintenanceDashboard(userId: string, propertyIds: string[]) {
        // Get assignments specifically for this maintenance user
        const assignments = await this.prisma.maintenanceAssignment.findMany({
            where: {
                assignedUserId: userId,
                maintenanceRequest: {
                    status: { in: ['OPEN', 'IN_PROGRESS'] }
                }
            },
            include: {
                maintenanceRequest: {
                    include: {
                        property: { select: { name: true } },
                        space: { select: { name: true } }
                    }
                }
            },
            orderBy: [
                { maintenanceRequest: { priority: 'desc' } },
                { maintenanceRequest: { createdAt: 'asc' } }
            ]
        });

        // Get overall stats for this user's assignments
        const allUserAssignments = await this.prisma.maintenanceAssignment.findMany({
            where: {
                assignedUserId: userId
            },
            include: {
                maintenanceRequest: {
                    select: {
                        status: true,
                        priority: true
                    }
                }
            }
        });

        const workOrders = assignments.map(assignment => ({
            id: assignment.maintenanceRequest.id,
            title: assignment.maintenanceRequest.title,
            priority: assignment.maintenanceRequest.priority,
            status: assignment.maintenanceRequest.status,
            property: assignment.maintenanceRequest.property.name,
            unit: assignment.maintenanceRequest.space?.name || 'Common Area',
            createdAt: assignment.maintenanceRequest.createdAt,
            assignmentStatus: assignment.status,
        }));

        return {
            dashboardType: 'MAINTENANCE',
            assignments: {
                total: assignments.length,
                emergency: workOrders.filter(w => w.priority === 'EMERGENCY').length,
                high: workOrders.filter(w => w.priority === 'HIGH').length,
            },
            workOrders: workOrders.slice(0, 10),
            performance: {
                completed: allUserAssignments.filter(a => a.status === 'COMPLETED').length,
                inProgress: allUserAssignments.filter(a => a.status === 'IN_PROGRESS').length,
            },
            generatedAt: new Date(),
        };
    }

    // TENANT Dashboard
    async getTenantDashboard(userId: string) {
        if (!userId) {
            return {
                dashboardType: 'TENANT',
                message: 'User ID is required',
                generatedAt: new Date(),
            };
        }

        // Get user with tenant profile
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                tenantProfile: true,
            }
        });

        if (!user?.tenantProfile) {
            return {
                dashboardType: 'TENANT',
                message: 'No tenant profile found',
                generatedAt: new Date(),
            };
        }

        // Get leases - they're linked directly to the user via tenantId
        const activeLeases = await this.prisma.lease.findMany({
            where: {
                tenantId: userId,
                status: { in: ['ACTIVE'] }
            },
            include: {
                space: {
                    include: { property: true }
                },
                rentPayments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 5
                }
            }
        });

        const activeLease = activeLeases[0];
        if (!activeLease) {
            return {
                dashboardType: 'TENANT',
                message: 'No active lease found',
                generatedAt: new Date(),
            };
        }

        // Get maintenance requests for this tenant
        const maintenanceRequests = await this.prisma.maintenanceRequest.findMany({
            where: {
                tenantId: userId
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        return {
            dashboardType: 'TENANT',
            lease: {
                property: activeLease.space.property.name,
                unit: activeLease.space.name,
                monthlyRent: Number(activeLease.monthlyRent),
                leaseEnd: activeLease.endDate,
                daysUntilExpiry: activeLease.endDate ?
                    Math.ceil((activeLease.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
            },
            payments: {
                recent: activeLease.rentPayments.map(p => ({
                    date: p.paymentDate,
                    amount: Number(p.amount),
                    status: p.status
                })),
                nextDue: this.calculateNextPaymentDue(activeLease.rentPayments)
            },
            maintenance: {
                recent: maintenanceRequests.map(r => ({
                    id: r.id,
                    title: r.title,
                    status: r.status,
                    createdAt: r.createdAt
                }))
            },
            generatedAt: new Date(),
        };
    }

    async getDashboardMetrics(
        entityId: string,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[]
    ) {
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        const [occupancyData, financialSummary] = await Promise.all([
            this.getOccupancyAnalytics(entityId, userRole, userOrgId, userEntities),
            this.getRecentFinancialSummary(entityId),
        ]);

        return {
            entityId,
            occupancy: {
                rate: occupancyData.summary.occupancyRate,
                totalSpaces: occupancyData.summary.totalSpaces,
                occupiedSpaces: occupancyData.summary.occupiedSpaces,
            },
            financial: financialSummary,
            lastUpdated: new Date(),
        };
    }

    // ============= HELPER METHODS =============

    private async getEntityOccupancyMetrics(entityIds: string[]) {
        const spaces = await this.prisma.space.findMany({
            where: { property: { entityId: { in: entityIds } } },
            include: { leases: { where: { status: 'ACTIVE' } } }
        });

        const totalSpaces = spaces.length;
        const occupiedSpaces = spaces.filter(s => s.leases.length > 0).length;

        return {
            rate: totalSpaces > 0 ? Math.round((occupiedSpaces / totalSpaces) * 10000) / 100 : 0,
            totalSpaces,
            occupiedSpaces,
        };
    }

    private async getEntityFinancialMetrics(entityIds: string[]) {
        const currentMonth = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const revenue = await this.prisma.paymentApplication.aggregate({
            where: {
                payment: {
                    createdAt: { gte: lastMonth, lte: currentMonth },
                },
                invoice: {
                    lease: {
                        space: {
                            property: { entityId: { in: entityIds } }
                        }
                    }
                }
            },
            _sum: { appliedAmount: true }
        });

        return { monthlyRevenue: Number(revenue._sum.appliedAmount || 0) };
    }

    private async getEntityMaintenanceMetrics(entityIds: string[]) {
        const stats = await this.prisma.maintenanceRequest.groupBy({
            by: ['status', 'priority'],
            where: { property: { entityId: { in: entityIds } } },
            _count: true
        });

        return {
            openTasks: stats.filter(s => s.status === 'OPEN').reduce((sum, s) => sum + s._count, 0),
            emergency: stats.filter(s => s.priority === 'EMERGENCY').reduce((sum, s) => sum + s._count, 0),
        };
    }

    private async getEntityLeaseMetrics(entityIds: string[]) {
        const expiring = await this.prisma.lease.count({
            where: {
                space: { property: { entityId: { in: entityIds } } },
                status: 'ACTIVE',
                endDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
            }
        });

        return { expiring };
    }

    private getEmptyDashboard(dashboardType: string) {
        return {
            dashboardType,
            message: 'No data available - no assigned properties or entities',
            generatedAt: new Date(),
        };
    }

    private calculateNextPaymentDue(payments: any[]) {
        if (payments.length === 0) return null;

        const lastPayment = payments[0];
        const nextDue = new Date(lastPayment.paymentDate);
        nextDue.setMonth(nextDue.getMonth() + 1);

        return nextDue;
    }

    private async getIncomeForPeriod(entityId: string, start: Date, end: Date) {
        const payments = await this.prisma.paymentApplication.aggregate({
            where: {
                payment: {
                    createdAt: {
                        gte: start,
                        lte: end,
                    },
                },
                invoice: {
                    lease: {
                        space: {
                            property: {
                                entityId,
                            },
                        },
                    },
                },
            },
            _sum: {
                appliedAmount: true,
            },
        });

        return {
            total: Number(payments._sum.appliedAmount || 0),
        };
    }

    private async getExpensesForPeriod(entityId: string, start: Date, end: Date) {
        const expenses = await this.prisma.propertyExpense.aggregate({
            where: {
                property: {
                    entityId,
                },
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            _sum: {
                amount: true,
            },
        });

        return {
            total: Number(expenses._sum.amount || 0),
        };
    }

    private generateSimpleProjections(summary: any) {
        const monthlyGrowthRate = 0.02;
        const projectedMonthlyRevenue = summary.totalMonthlyRevenue * (1 + monthlyGrowthRate);

        return {
            nextMonth: {
                projectedRevenue: projectedMonthlyRevenue,
                growthRate: monthlyGrowthRate * 100,
            },
            nextQuarter: {
                projectedRevenue: projectedMonthlyRevenue * 3,
                growthRate: (monthlyGrowthRate * 3) * 100,
            },
        };
    }

    private async getRecentFinancialSummary(entityId: string) {
        const currentMonth = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const monthlyRevenue = await this.prisma.paymentApplication.aggregate({
            where: {
                payment: {
                    createdAt: {
                        gte: lastMonth,
                        lte: currentMonth,
                    },
                },
                invoice: {
                    lease: {
                        space: {
                            property: { entityId },
                        },
                    },
                },
            },
            _sum: { appliedAmount: true },
        });

        return {
            monthlyRevenue: Number(monthlyRevenue._sum.appliedAmount || 0),
            period: {
                start: lastMonth,
                end: currentMonth,
            },
        };
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