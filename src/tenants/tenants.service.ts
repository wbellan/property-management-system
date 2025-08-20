import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { UserRole, UserStatus, Prisma } from '@prisma/client';

export interface CreateTenantData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    dateOfBirth?: string;
    ssn?: string;
    isBusinessTenant?: boolean;
    businessName?: string;
    businessTaxId?: string;
    previousLandlord?: string;
    employerInfo?: string;
    monthlyIncome?: number;
    enablePortalAccess?: boolean;
    notes?: string;
}

@Injectable()
export class TenantsService {
    constructor(
        private prisma: PrismaService,
        private usersService: UsersService,
    ) { }

    async createTenant(organizationId: string, dto: CreateTenantData) {
        return this.prisma.$transaction(async (tx) => {
            // Create tenant record
            const tenant = await tx.tenant.create({
                data: {
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    email: dto.email,
                    phone: dto.phone,
                    emergencyContactName: dto.emergencyContactName,
                    emergencyContactPhone: dto.emergencyContactPhone,
                    dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
                    ssn: dto.ssn, // Should be encrypted in production
                    isBusinessTenant: dto.isBusinessTenant || false,
                    businessName: dto.businessName,
                    businessTaxId: dto.businessTaxId,
                    previousLandlord: dto.previousLandlord,
                    employerInfo: dto.employerInfo,
                    monthlyIncome: dto.monthlyIncome ? new Prisma.Decimal(dto.monthlyIncome) : null,
                    organizationId,
                    notes: dto.notes,
                }
            });

            // Create user account if portal access is enabled
            let user = null;
            if (dto.enablePortalAccess) {
                // Check if user with this email already exists
                const existingUser = await tx.user.findUnique({
                    where: { email: dto.email }
                });

                if (existingUser) {
                    // Link existing user to tenant
                    await tx.tenant.update({
                        where: { id: tenant.id },
                        data: { userId: existingUser.id }
                    });
                    user = existingUser;
                } else {
                    // Create new user
                    user = await tx.user.create({
                        data: {
                            email: dto.email,
                            firstName: dto.firstName,
                            lastName: dto.lastName,
                            passwordHash: '', // Will be set via invitation
                            role: UserRole.TENANT,
                            status: UserStatus.PENDING,
                            organizationId,
                        }
                    });

                    // Link user to tenant
                    await tx.tenant.update({
                        where: { id: tenant.id },
                        data: { userId: user.id }
                    });
                }
            }

            return {
                ...tenant,
                user,
                hasPortalAccess: !!user,
            };
        });
    }

    async getTenantsInOrganization(organizationId: string, page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const [tenants, total] = await Promise.all([
            this.prisma.tenant.findMany({
                where: { organizationId },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            status: true,
                            lastLoginAt: true,
                            emailVerified: true,
                            // Get leases through user relationship
                            leases: {
                                include: {
                                    space: {
                                        include: {
                                            property: {
                                                select: { name: true, address: true }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.tenant.count({
                where: { organizationId }
            })
        ]);

        return {
            data: tenants.map(tenant => ({
                ...tenant,
                hasPortalAccess: !!tenant.user,
                currentLeases: tenant.user?.leases?.filter(lease =>
                    lease.endDate === null || lease.endDate > new Date()
                ) || [],
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            }
        };
    }

    async getTenantById(tenantId: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        status: true,
                        lastLoginAt: true,
                        emailVerified: true,
                        leases: {
                            include: {
                                space: {
                                    include: {
                                        property: {
                                            select: { name: true, address: true }
                                        }
                                    }
                                },
                                invoices: true,
                                rentPayments: true,
                            }
                        }
                    }
                },
            }
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        return {
            ...tenant,
            hasPortalAccess: !!tenant.user,
        };
    }

    async updateTenant(tenantId: string, updates: Partial<CreateTenantData>) {
        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                ...updates,
                dateOfBirth: updates.dateOfBirth ? new Date(updates.dateOfBirth) : undefined,
                monthlyIncome: updates.monthlyIncome ? new Prisma.Decimal(updates.monthlyIncome) : undefined,
            }
        });
    }

    async enablePortalAccess(tenantId: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { organization: true }
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        if (tenant.userId) {
            throw new ConflictException('Tenant already has portal access');
        }

        return this.prisma.$transaction(async (tx) => {
            // Create user account
            const user = await tx.user.create({
                data: {
                    email: tenant.email,
                    firstName: tenant.firstName,
                    lastName: tenant.lastName,
                    passwordHash: '', // Will be set via invitation
                    role: UserRole.TENANT,
                    status: UserStatus.PENDING,
                    organizationId: tenant.organizationId,
                }
            });

            // Link user to tenant
            await tx.tenant.update({
                where: { id: tenantId },
                data: { userId: user.id }
            });

            return user;
        });
    }

    async disablePortalAccess(tenantId: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { user: true }
        });

        if (!tenant?.user) {
            throw new NotFoundException('Tenant does not have portal access');
        }

        return this.prisma.$transaction(async (tx) => {
            // Remove user link
            await tx.tenant.update({
                where: { id: tenantId },
                data: { userId: null }
            });

            // Deactivate user account
            await tx.user.update({
                where: { id: tenant.user.id },
                data: { status: UserStatus.INACTIVE }
            });
        });
    }

    async searchTenants(organizationId: string, searchTerm: string, page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const where: Prisma.TenantWhereInput = {
            organizationId,
            OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' } },
                { lastName: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm, mode: 'insensitive' } },
                { businessName: { contains: searchTerm, mode: 'insensitive' } },
            ]
        };

        const [tenants, total] = await Promise.all([
            this.prisma.tenant.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            status: true,
                            lastLoginAt: true,
                            leases: {
                                where: {
                                    OR: [
                                        { status: 'ACTIVE' },
                                    ]
                                },
                                include: {
                                    space: {
                                        include: {
                                            property: {
                                                select: { name: true }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.tenant.count({ where })
        ]);

        return {
            data: tenants,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            }
        };
    }
}