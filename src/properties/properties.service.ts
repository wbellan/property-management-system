// src/properties/properties.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';

@Injectable()
export class PropertiesService {
    constructor(private prisma: PrismaService) { }

    async create(createPropertyDto: CreatePropertyDto, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        // Check permissions
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER) {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Verify entity exists and user has access
        const entity = await this.prisma.entity.findUnique({
            where: { id: createPropertyDto.entityId },
            include: { organization: true },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        // Check entity access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Entity belongs to different organization');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(createPropertyDto.entityId)) {
                throw new ForbiddenException('No access to this entity');
            }
        }

        const property = await this.prisma.property.create({
            data: {
                name: createPropertyDto.name,
                address: createPropertyDto.address,
                city: createPropertyDto.city,
                state: createPropertyDto.state,
                zipCode: createPropertyDto.zipCode,
                propertyType: createPropertyDto.propertyType,
                description: createPropertyDto.description,
                totalSpaces: createPropertyDto.totalSpaces ?? 1,
                purchasePrice: createPropertyDto.purchasePrice,
                currentMarketValue: createPropertyDto.currentMarketValue,
                entity: { connect: { id: createPropertyDto.entityId } },
            },
            include: {
                entity: {
                    select: {
                        id: true,
                        name: true,
                        organization: { select: { id: true, name: true } },
                    },
                },
            },
        });

        return property;
    }

    async findAll(query: PropertyQueryDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        const { page, limit, search, propertyType, city, state, entityId } = query;

        // Build where clause based on user permissions
        let where: any = {};

        if (userRole === UserRole.SUPER_ADMIN) {
            // Super admin can see all properties
        } else if (userRole === UserRole.ORG_ADMIN) {
            // Org admin can see all properties in their organization
            where.entity = { organizationId: userOrgId };
        } else if (userRole === UserRole.ENTITY_MANAGER) {
            // Entity manager can see properties of entities they manage
            where.entityId = { in: userEntities };
        } else if (userRole === UserRole.PROPERTY_MANAGER) {
            // Property manager can only see properties they manage
            where.id = { in: userProperties };
        } else {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Add filters
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (propertyType) {
            where.propertyType = propertyType;
        }

        if (city) {
            where.city = { contains: city, mode: 'insensitive' };
        }

        if (state) {
            where.state = { contains: state, mode: 'insensitive' };
        }

        if (entityId) {
            // Verify user has access to this entity
            if (userRole !== UserRole.SUPER_ADMIN) {
                if (userRole === UserRole.ORG_ADMIN) {
                    const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
                    if (!entity || entity.organizationId !== userOrgId) {
                        throw new ForbiddenException('No access to this entity');
                    }
                }
                if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(entityId)) {
                    throw new ForbiddenException('No access to this entity');
                }
            }
            where.entityId = entityId;
        }

        return this.prisma.paginate(this.prisma.property, {
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
                        spaces: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        const property = await this.prisma.property.findUnique({
            where: { id },
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
                spaces: {
                    include: {
                        leases: {
                            where: { status: 'ACTIVE' },
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
                        _count: {
                            select: {
                                leases: true,
                            },
                        },
                    },
                    orderBy: { name: 'asc' },
                },
                maintenanceReqs: {
                    where: {
                        status: { in: ['OPEN', 'IN_PROGRESS'] },
                    },
                    include: {
                        tenant: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        space: {
                            select: {
                                name: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10, // Last 10 maintenance requests
                },
                _count: {
                    select: {
                        spaces: true,
                        maintenanceReqs: true,
                    },
                },
            },
        });

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && property.entity.organization.id !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(property.entityId)) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(id)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        return property;
    }

    async update(id: string, updatePropertyDto: UpdatePropertyDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        // Check permissions
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.PROPERTY_MANAGER) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const property = await this.prisma.property.findUnique({
            where: { id },
            include: {
                entity: {
                    select: {
                        organizationId: true,
                    },
                },
            },
        });

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && property.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(property.entityId)) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(id)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        const updatedProperty = await this.prisma.property.update({
            where: { id },
            data: {
                ...(updatePropertyDto.propertyType
                    ? { propertyType: { set: updatePropertyDto.propertyType } }
                    : {}),
                name: updatePropertyDto.name,
                address: updatePropertyDto.address,
                city: updatePropertyDto.city,
                state: updatePropertyDto.state,
                zipCode: updatePropertyDto.zipCode,
                description: updatePropertyDto.description,
                totalSpaces: updatePropertyDto.totalSpaces,
                purchasePrice: updatePropertyDto.purchasePrice,
                currentMarketValue: updatePropertyDto.currentMarketValue,
                ...(updatePropertyDto.entityId
                    ? { entity: { connect: { id: updatePropertyDto.entityId } } }
                    : {}),
            },
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
                        spaces: true,
                    },
                },
            },
        });

        return updatedProperty;
    }

    async remove(id: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        // Only higher-level roles can delete properties
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const property = await this.prisma.property.findUnique({
            where: { id },
            include: {
                entity: {
                    select: {
                        organizationId: true,
                    },
                },
                _count: {
                    select: {
                        spaces: true,
                    },
                },
            },
        });

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && property.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(property.entityId)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        // Check if property has spaces
        if (property._count.spaces > 0) {
            throw new BadRequestException('Cannot delete property with existing spaces. Delete spaces first.');
        }

        await this.prisma.property.delete({
            where: { id },
        });

        return { message: 'Property deleted successfully' };
    }

    async getPropertyStats(id: string, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        // First verify access to the property
        const property = await this.findOne(id, userRole, userOrgId, userEntities, userProperties);

        // Get comprehensive stats
        const [
            totalSpaces,
            occupiedSpaces,
            availableSpaces,
            activeLeases,
            monthlyRentRoll,
            pendingMaintenance,
            emergencyMaintenance,
            avgRentPerUnit,
        ] = await Promise.all([
            this.prisma.space.count({ where: { propertyId: id } }),
            this.prisma.space.count({
                where: {
                    propertyId: id,
                    leases: {
                        some: { status: 'ACTIVE' },
                    },
                },
            }),
            this.prisma.space.count({
                where: {
                    propertyId: id,
                    leases: {
                        none: { status: 'ACTIVE' },
                    },
                },
            }),
            this.prisma.lease.count({
                where: {
                    status: 'ACTIVE',
                    space: { propertyId: id },
                },
            }),
            this.prisma.lease.aggregate({
                where: {
                    status: 'ACTIVE',
                    space: { propertyId: id },
                },
                _sum: { monthlyRent: true },
            }),
            this.prisma.maintenanceRequest.count({
                where: {
                    propertyId: id,
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                    priority: { not: 'EMERGENCY' },
                },
            }),
            this.prisma.maintenanceRequest.count({
                where: {
                    propertyId: id,
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                    priority: 'EMERGENCY',
                },
            }),
            this.prisma.lease.aggregate({
                where: {
                    status: 'ACTIVE',
                    space: { propertyId: id },
                },
                _avg: { monthlyRent: true },
            }),
        ]);

        // Calculate occupancy rate
        const occupancyRate = totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0;

        return {
            property: {
                id: property.id,
                name: property.name,
                address: property.address,
                totalSpaces: property.totalSpaces,
            },
            occupancy: {
                totalSpaces,
                occupiedSpaces,
                availableSpaces,
                occupancyRate: Math.round(occupancyRate * 100) / 100,
            },
            financial: {
                activeLeases,
                monthlyRentRoll: monthlyRentRoll._sum.monthlyRent || 0,
                avgRentPerUnit: avgRentPerUnit._avg.monthlyRent || 0,
            },
            maintenance: {
                pendingRequests: pendingMaintenance,
                emergencyRequests: emergencyMaintenance,
                totalPending: pendingMaintenance + emergencyMaintenance,
            },
        };
    }

    async getPropertiesByEntity(entityId: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        // Verify entity access
        const entity = await this.prisma.entity.findUnique({
            where: { id: entityId },
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && entity.organizationId !== userOrgId) {
                throw new ForbiddenException('No access to this entity');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(entityId)) {
                throw new ForbiddenException('No access to this entity');
            }
        }

        const properties = await this.prisma.property.findMany({
            where: { entityId },
            include: {
                _count: {
                    select: {
                        spaces: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        return {
            entity: {
                id: entity.id,
                name: entity.name,
            },
            properties,
        };
    }
}