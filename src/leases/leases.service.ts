// src/leases/leases.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole, LeaseStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { LeaseQueryDto } from './dto/lease-query.dto';
import { RenewLeaseDto } from './dto/renew-lease.dto';
import { RentIncreaseDto } from './dto/rent-increase.dto';

@Injectable()
export class LeasesService {
    constructor(private prisma: PrismaService) { }

    async create(createLeaseDto: CreateLeaseDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        // Check permissions
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.PROPERTY_MANAGER) {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Verify space exists and user has access
        const space = await this.prisma.space.findUnique({
            where: { id: createLeaseDto.spaceId },
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
                leases: {
                    where: { status: 'ACTIVE' },
                },
            },
        });

        if (!space) {
            throw new NotFoundException('Space not found');
        }

        // Check if space already has an active lease
        if (space.leases.length > 0) {
            throw new BadRequestException('Space already has an active lease');
        }

        // Check space access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && space.property.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Space belongs to different organization');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(space.property.entityId)) {
                throw new ForbiddenException('No access to this space entity');
            }
            if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(space.propertyId)) {
                throw new ForbiddenException('No access to this space property');
            }
        }

        // Verify tenant exists and belongs to same organization
        const tenant = await this.prisma.user.findUnique({
            where: { id: createLeaseDto.tenantId },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        if (tenant.role !== UserRole.TENANT) {
            throw new BadRequestException('User is not a tenant');
        }

        if (userRole !== UserRole.SUPER_ADMIN && tenant.organizationId !== userOrgId) {
            throw new ForbiddenException('Tenant belongs to different organization');
        }

        // Validate dates
        const startDate = new Date(createLeaseDto.startDate);
        const endDate = new Date(createLeaseDto.endDate);

        if (endDate <= startDate) {
            throw new BadRequestException('End date must be after start date');
        }

        const lease = await this.prisma.lease.create({
            data: {
                ...createLeaseDto,
                startDate,
                endDate,
            },
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
        });

        return lease;
    }

    async findAll(query: LeaseQueryDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        const { page, limit, search, status, propertyId, spaceId, tenantId, startDateFrom, startDateTo, expiringWithin30Days, entityId } = query;

        // Build where clause based on user permissions
        let where: any = {};

        if (userRole === UserRole.SUPER_ADMIN) {
            // Super admin can see all leases
        } else if (userRole === UserRole.ORG_ADMIN) {
            // Org admin can see all leases in their organization
            where.space = { property: { entity: { organizationId: userOrgId } } };
        } else if (userRole === UserRole.ENTITY_MANAGER) {
            // Entity manager can see leases for entities they manage
            where.space = { property: { entityId: { in: userEntities } } };
        } else if (userRole === UserRole.PROPERTY_MANAGER) {
            // Property manager can see leases for properties they manage
            where.space = { propertyId: { in: userProperties } };
        } else if (userRole === UserRole.TENANT) {
            // Tenants can only see their own leases
            where.tenant = { organizationId: userOrgId };
        } else {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Add filters
        if (search) {
            where.OR = [
                { tenant: { firstName: { contains: search, mode: 'insensitive' } } },
                { tenant: { lastName: { contains: search, mode: 'insensitive' } } },
                { tenant: { email: { contains: search, mode: 'insensitive' } } },
                { space: { unitNumber: { contains: search, mode: 'insensitive' } } },
                { space: { property: { name: { contains: search, mode: 'insensitive' } } } },
            ];
        }

        if (status) {
            where.status = status;
        }

        if (propertyId) {
            await this.verifyPropertyAccess(propertyId, userRole, userOrgId, userEntities, userProperties);
            where.space = { ...where.space, propertyId };
        }

        if (spaceId) {
            where.spaceId = spaceId;
        }

        if (tenantId) {
            where.tenantId = tenantId;
        }

        if (entityId) {
            await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);
            where.space = { ...where.space, property: { entityId } };
        }

        if (startDateFrom) {
            where.startDate = { ...where.startDate, gte: new Date(startDateFrom) };
        }

        if (startDateTo) {
            where.startDate = { ...where.startDate, lte: new Date(startDateTo) };
        }

        if (expiringWithin30Days) {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            where.endDate = { lte: thirtyDaysFromNow };
            where.status = 'ACTIVE';
        }

        return this.prisma.paginate(this.prisma.lease, {
            page,
            limit,
            where,
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
                rentPayments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 3, // Last 3 payments
                },
                _count: {
                    select: {
                        rentPayments: true,
                        invoices: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        const lease = await this.prisma.lease.findUnique({
            where: { id },
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
                        status: true,
                    },
                },
                rentPayments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 12, // Last 12 payments
                },
                rentIncreases: {
                    orderBy: { effectiveDate: 'desc' },
                },
                leaseRenewals: {
                    orderBy: { renewedAt: 'desc' },
                },
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 10, // Last 10 invoices
                },
                _count: {
                    select: {
                        rentPayments: true,
                        invoices: true,
                        rentIncreases: true,
                        leaseRenewals: true,
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
            if (userRole === UserRole.TENANT && lease.tenantId !== userOrgId) {
                throw new ForbiddenException('Can only view your own lease');
            }
        }

        return lease;
    }

    async update(id: string, updateLeaseDto: UpdateLeaseDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        // Check permissions
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.PROPERTY_MANAGER) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const lease = await this.prisma.lease.findUnique({
            where: { id },
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

        // Validate dates if being updated
        if (updateLeaseDto.startDate || updateLeaseDto.endDate) {
            const startDate = updateLeaseDto.startDate ? new Date(updateLeaseDto.startDate) : lease.startDate;
            const endDate = updateLeaseDto.endDate ? new Date(updateLeaseDto.endDate) : lease.endDate;

            if (endDate <= startDate) {
                throw new BadRequestException('End date must be after start date');
            }
        }

        const updatedLease = await this.prisma.lease.update({
            where: { id },
            data: {
                ...updateLeaseDto,
                ...(updateLeaseDto.startDate && { startDate: new Date(updateLeaseDto.startDate) }),
                ...(updateLeaseDto.endDate && { endDate: new Date(updateLeaseDto.endDate) }),
            },
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
        });

        return updatedLease;
    }

    async remove(id: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        // Only higher-level roles can delete leases
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const lease = await this.prisma.lease.findUnique({
            where: { id },
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
                _count: {
                    select: {
                        rentPayments: true,
                        invoices: true,
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
        }

        // Check if lease can be safely deleted
        if (lease.status === 'ACTIVE') {
            throw new BadRequestException('Cannot delete active lease. Terminate it first.');
        }

        if (lease._count.rentPayments > 0 || lease._count.invoices > 0) {
            throw new BadRequestException('Cannot delete lease with existing payments or invoices');
        }

        await this.prisma.lease.delete({
            where: { id },
        });

        return { message: 'Lease deleted successfully' };
    }

    async renewLease(id: string, renewLeaseDto: RenewLeaseDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        // Check permissions
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.PROPERTY_MANAGER) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const lease = await this.prisma.lease.findUnique({
            where: { id },
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

        if (lease.status !== 'ACTIVE') {
            throw new BadRequestException('Can only renew active leases');
        }

        const newEndDate = new Date(renewLeaseDto.newEndDate);
        if (newEndDate <= lease.endDate) {
            throw new BadRequestException('New end date must be after current end date');
        }

        // Use transaction to update lease and create renewal record
        const result = await this.prisma.$transaction(async (tx) => {
            // Update the lease
            const updatedLease = await tx.lease.update({
                where: { id },
                data: {
                    endDate: newEndDate,
                    monthlyRent: renewLeaseDto.newMonthlyRent,
                    status: 'RENEWED',
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

            // Create renewal record
            const renewal = await tx.leaseRenewal.create({
                data: {
                    leaseId: id,
                    newEndDate,
                    newMonthlyRent: renewLeaseDto.newMonthlyRent,
                    notes: renewLeaseDto.notes,
                },
            });

            return { lease: updatedLease, renewal };
        });

        return result;
    }

    async addRentIncrease(id: string, rentIncreaseDto: RentIncreaseDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        // Check permissions
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.PROPERTY_MANAGER) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const lease = await this.prisma.lease.findUnique({
            where: { id },
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

        if (lease.status !== 'ACTIVE') {
            throw new BadRequestException('Can only increase rent for active leases');
        }

        const effectiveDate = new Date(rentIncreaseDto.effectiveDate);
        const now = new Date();

        if (effectiveDate < now) {
            throw new BadRequestException('Effective date cannot be in the past');
        }

        if (rentIncreaseDto.newRent <= Number(lease.monthlyRent)) {
            throw new BadRequestException('New rent must be higher than current rent');
        }

        const increaseAmount = rentIncreaseDto.newRent - Number(lease.monthlyRent);
        const increasePercent = (increaseAmount / Number(lease.monthlyRent)) * 100;


        // Use transaction to update lease and create rent increase record
        const result = await this.prisma.$transaction(async (tx) => {
            // Create rent increase record
            const rentIncrease = await tx.rentIncrease.create({
                data: {
                    leaseId: id,
                    previousRent: lease.monthlyRent,
                    newRent: rentIncreaseDto.newRent,
                    increaseAmount,
                    increasePercent,
                    effectiveDate,
                    reason: rentIncreaseDto.reason,
                },
            });

            // Update lease rent if effective date is today or in the past
            let updatedLease = lease;
            if (effectiveDate <= now) {
                updatedLease = await tx.lease.update({
                    where: { id },
                    data: { monthlyRent: rentIncreaseDto.newRent },
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
            }

            return { lease: updatedLease, rentIncrease };
        });

        return result;
    }

    async terminateLease(id: string, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        // Check permissions
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.PROPERTY_MANAGER) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const lease = await this.prisma.lease.findUnique({
            where: { id },
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

        if (lease.status !== 'ACTIVE' && lease.status !== 'RENEWED') {
            throw new BadRequestException('Can only terminate active or renewed leases');
        }

        const updatedLease = await this.prisma.lease.update({
            where: { id },
            data: { status: 'TERMINATED' },
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

        return { message: 'Lease terminated successfully', lease: updatedLease };
    }

    async getExpiringLeases(userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[], days: number = 30) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + days);

        let where: any = {
            status: 'ACTIVE',
            endDate: { lte: expirationDate },
        };

        // Apply access controls
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN) {
                where.space = { property: { entity: { organizationId: userOrgId } } };
            } else if (userRole === UserRole.ENTITY_MANAGER) {
                where.space = { property: { entityId: { in: userEntities } } };
            } else if (userRole === UserRole.PROPERTY_MANAGER) {
                where.space = { propertyId: { in: userProperties } };
            }
        }

        const expiringLeases = await this.prisma.lease.findMany({
            where,
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
            orderBy: { endDate: 'asc' },
        });

        return expiringLeases;
    }

    async getLeasesByTenant(tenantId: string, userRole: UserRole, userOrgId: string) {
        // Verify tenant exists and user has access
        const tenant = await this.prisma.user.findUnique({
            where: { id: tenantId },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        if (tenant.role !== UserRole.TENANT) {
            throw new BadRequestException('User is not a tenant');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN && tenant.organizationId !== userOrgId) {
            throw new ForbiddenException('Tenant belongs to different organization');
        }

        const leases = await this.prisma.lease.findMany({
            where: { tenantId },
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
                rentPayments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 5,
                },
                _count: {
                    select: {
                        rentPayments: true,
                        invoices: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return {
            tenant: {
                id: tenant.id,
                firstName: tenant.firstName,
                lastName: tenant.lastName,
                email: tenant.email,
            },
            leases,
        };
    }

    private async verifyPropertyAccess(propertyId: string, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
            include: {
                entity: {
                    select: {
                        id: true,
                        organizationId: true,
                    },
                },
            },
        });

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && property.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('No access to this property');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(property.entityId)) {
                throw new ForbiddenException('No access to this property');
            }
            if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(propertyId)) {
                throw new ForbiddenException('No access to this property');
            }
        }

        return property;
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