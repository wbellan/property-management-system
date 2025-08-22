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

        // Get revenue data from payments
        const revenue = await this.prisma.payment.aggregate({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
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
                amount: true,
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
        const totalRevenue = Number(revenue._sum.amount || 0);
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
                { unitNumber: 'asc' }, // Use unitNumber instead of name
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
                spaceName: space.unitNumber, // Use unitNumber as spaceName
                propertyId: space.property.id,
                propertyName: space.property.name,
                propertyAddress: space.property.address,
                propertyType: space.property.propertyType,
                squareFootage: Number(space.squareFeet), // Use squareFeet instead of squareFootage
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
                    name: lease.space.unitNumber, // Use unitNumber instead of name
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
                        unitNumber: true, // Use unitNumber instead of name
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
                    name: lease.space.unitNumber, // Use unitNumber instead of name
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
        format: 'json' | 'csv' | 'xlsx',
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

    // In reports.service.ts - Add new method
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
        const currentMonth = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const monthlyRevenue = await this.prisma.payment.aggregate({
            where: {
                createdAt: { gte: lastMonth, lte: currentMonth },
                invoice: {
                    lease: {
                        space: {
                            property: {
                                entityId: { in: accessibleEntityIds }
                            }
                        }
                    }
                }
            },
            _sum: { amount: true }
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
                monthlyRevenue: Number(monthlyRevenue._sum.amount || 0),
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

    // ============= HELPER METHODS =============

    private async getIncomeForPeriod(entityId: string, start: Date, end: Date) {
        const payments = await this.prisma.payment.aggregate({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
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
                amount: true,
            },
        });

        return {
            total: Number(payments._sum.amount || 0),
        };
    }

    private async getExpensesForPeriod(entityId: string, start: Date, end: Date) {
        const expenses = await this.prisma.propertyExpense.aggregate({
            where: {
                property: {
                    entityId,
                },
                createdAt: { // Use createdAt instead of date
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

        const monthlyRevenue = await this.prisma.payment.aggregate({
            where: {
                createdAt: {
                    gte: lastMonth,
                    lte: currentMonth,
                },
                invoice: {
                    lease: {
                        space: {
                            property: { entityId },
                        },
                    },
                },
            },
            _sum: { amount: true },
        });

        return {
            monthlyRevenue: Number(monthlyRevenue._sum.amount || 0),
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