// src/entities/entities.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Entity, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { EntityQueryDto } from './dto/entity-query.dto';
import { MarkVerifiedDto } from './dto/mark-verified.dto';

@Injectable()
export class EntitiesService {
    constructor(private prisma: PrismaService) { }

    async create(createEntityDto: CreateEntityDto, userRole: UserRole, userOrgId: string) {
        // Check permissions
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN) {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Verify organization access
        if (userRole !== UserRole.SUPER_ADMIN && createEntityDto.organizationId !== userOrgId) {
            throw new ForbiddenException('Cannot create entity for different organization');
        }

        // Verify organization exists
        const organization = await this.prisma.organization.findUnique({
            where: { id: createEntityDto.organizationId },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        const entity = await this.prisma.entity.create({
            data: {
                ...createEntityDto,
                isActive: createEntityDto.isActive ?? true, // Default to true if not provided
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        properties: true,
                        bankLedgers: true,
                    },
                },
            },
        });

        return entity;
    }

    async findAll(query: EntityQueryDto, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        const { page, limit, search, entityType } = query;

        // Build where clause based on user permissions
        let where: any = {};

        if (userRole === UserRole.SUPER_ADMIN) {
            // Super admin can see all entities
        } else if (userRole === UserRole.ORG_ADMIN) {
            // Org admin can see all entities in their organization
            where.organizationId = userOrgId;
        } else if (userRole === UserRole.ENTITY_MANAGER) {
            // Entity manager can only see entities they manage
            where.id = { in: userEntities };
        } else {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Add search filters
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { legalName: { contains: search, mode: 'insensitive' } },
                { entityType: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (entityType) {
            where.entityType = entityType;
        }

        return this.prisma.paginate(this.prisma.entity, {
            page,
            limit,
            where,
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        properties: true,
                        bankLedgers: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        // Check permissions
        const entity = await this.prisma.entity.findUnique({
            where: { id },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                properties: {
                    include: {
                        _count: {
                            select: {
                                spaces: true,
                            },
                        },
                    },
                },
                bankLedgers: true,
                chartAccounts: {
                    where: { isActive: true },
                    orderBy: { accountCode: 'asc' },
                },
                _count: {
                    select: {
                        properties: true,
                        bankLedgers: true,
                        chartAccounts: true,
                    },
                },
            },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(id)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        return entity;
    }

    async update(id: string, updateEntityDto: UpdateEntityDto, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        // Check permissions
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const entity = await this.prisma.entity.findUnique({
            where: { id },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(id)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        const updatedEntity = await this.prisma.entity.update({
            where: { id },
            data: updateEntityDto,
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        properties: true,
                        bankLedgers: true,
                    },
                },
            },
        });

        return updatedEntity;
    }

    async remove(id: string, userRole: UserRole, userOrgId: string) {
        // Only super admin and org admin can delete entities
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const entity = await this.prisma.entity.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        properties: true,
                    },
                },
            },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        // Check access permissions
        if (userRole === UserRole.ORG_ADMIN && entity.organizationId !== userOrgId) {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Check if entity has properties
        if (entity._count.properties > 0) {
            throw new ForbiddenException('Cannot delete entity with existing properties');
        }

        await this.prisma.entity.delete({
            where: { id },
        });

        return { message: 'Entity deleted successfully' };
    }

    async getEntityStats(id: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        // Check permissions first
        const entity = await this.prisma.entity.findUnique({
            where: { id },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(id)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        // Get comprehensive stats
        const [
            totalProperties,
            totalSpaces,
            activeLeases,
            totalBankLedgers,
            totalBalance,
            monthlyRentRoll,
        ] = await Promise.all([
            this.prisma.property.count({ where: { entityId: id } }),
            this.prisma.space.count({
                where: { property: { entityId: id } },
            }),
            this.prisma.lease.count({
                where: {
                    status: 'ACTIVE',
                    space: { property: { entityId: id } },
                },
            }),
            this.prisma.bankLedger.count({ where: { entityId: id, isActive: true } }),
            this.prisma.bankLedger.aggregate({
                where: { entityId: id, isActive: true },
                _sum: { currentBalance: true },
            }),
            this.prisma.lease.aggregate({
                where: {
                    status: 'ACTIVE',
                    space: { property: { entityId: id } },
                },
                _sum: { monthlyRent: true },
            }),
        ]);

        // Calculate occupancy rate
        const occupancyRate = totalSpaces > 0 ? (activeLeases / totalSpaces) * 100 : 0;

        return {
            entity: {
                id: entity.id,
                name: entity.name,
            },
            stats: {
                totalProperties,
                totalSpaces,
                activeLeases,
                totalBankLedgers,
                totalBalance: totalBalance._sum.currentBalance || 0,
                monthlyRentRoll: monthlyRentRoll._sum.monthlyRent || 0,
                occupancyRate: Math.round(occupancyRate * 100) / 100,
            },
        };
    }

    async markAsVerified(
        id: string,
        markVerifiedDto: MarkVerifiedDto,
        userRole: UserRole,
        userOrgId: string,
        userEntities: string[]
    ): Promise<Entity> {
        // Check permissions (same as existing methods)
        const entity = await this.prisma.entity.findUnique({ where: { id } });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        // Verify access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(id)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        // Update entity with verification data
        return await this.prisma.entity.update({
            where: { id },
            data: {
                isVerified: markVerifiedDto.isVerified,
                verifiedAt: new Date(markVerifiedDto.verifiedAt),
            },
            include: {
                organization: {
                    select: { id: true, name: true }
                },
                _count: {
                    select: {
                        properties: true,
                        bankLedgers: true
                    }
                }
            }
        });
    }

}