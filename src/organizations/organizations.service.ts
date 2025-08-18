// src/organizations/organizations.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationQueryDto } from './dto/organization-query.dto';

@Injectable()
export class OrganizationsService {
    constructor(private prisma: PrismaService) { }

    async create(createOrganizationDto: CreateOrganizationDto) {
        const organization = await this.prisma.organization.create({
            data: createOrganizationDto,
            include: {
                _count: {
                    select: {
                        entities: true,
                        users: true,
                    },
                },
            },
        });

        return organization;
    }

    async findAll(query: OrganizationQueryDto, userRole: UserRole, userOrgId?: string) {
        // Super admins can see all organizations
        if (userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const { page, limit, search } = query;

        const where = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            }
            : {};

        return this.prisma.paginate(this.prisma.organization, {
            page,
            limit,
            where,
            include: {
                _count: {
                    select: {
                        entities: true,
                        users: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string, userRole: UserRole, userOrgId: string) {
        // Users can only see their own organization unless they're super admin
        if (userRole !== UserRole.SUPER_ADMIN && id !== userOrgId) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const organization = await this.prisma.organization.findUnique({
            where: { id },
            include: {
                entities: {
                    include: {
                        _count: {
                            select: {
                                properties: true,
                            },
                        },
                    },
                },
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        status: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        entities: true,
                        users: true,
                    },
                },
            },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        return organization;
    }

    async update(id: string, updateOrganizationDto: UpdateOrganizationDto, userRole: UserRole, userOrgId: string) {
        // Only super admins and org admins can update their organization
        if (userRole !== UserRole.SUPER_ADMIN && (userRole !== UserRole.ORG_ADMIN || id !== userOrgId)) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const organization = await this.prisma.organization.findUnique({
            where: { id },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        const updatedOrganization = await this.prisma.organization.update({
            where: { id },
            data: updateOrganizationDto,
            include: {
                _count: {
                    select: {
                        entities: true,
                        users: true,
                    },
                },
            },
        });

        return updatedOrganization;
    }

    async remove(id: string, userRole: UserRole) {
        // Only super admins can delete organizations
        if (userRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const organization = await this.prisma.organization.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        entities: true,
                        users: true,
                    },
                },
            },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        // Check if organization has entities or users
        if (organization._count.entities > 0 || organization._count.users > 0) {
            throw new ForbiddenException('Cannot delete organization with existing entities or users');
        }

        await this.prisma.organization.delete({
            where: { id },
        });

        return { message: 'Organization deleted successfully' };
    }

    async getOrganizationStats(id: string, userRole: UserRole, userOrgId: string) {
        // Users can only see their own organization stats unless they're super admin
        if (userRole !== UserRole.SUPER_ADMIN && id !== userOrgId) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const organization = await this.prisma.organization.findUnique({
            where: { id },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        // Get comprehensive stats
        const [
            totalEntities,
            totalProperties,
            totalSpaces,
            activeLeases,
            totalUsers,
            maintenanceRequests,
        ] = await Promise.all([
            this.prisma.entity.count({ where: { organizationId: id } }),
            this.prisma.property.count({
                where: { entity: { organizationId: id } },
            }),
            this.prisma.space.count({
                where: { property: { entity: { organizationId: id } } },
            }),
            this.prisma.lease.count({
                where: {
                    status: 'ACTIVE',
                    space: { property: { entity: { organizationId: id } } },
                },
            }),
            this.prisma.user.count({ where: { organizationId: id } }),
            this.prisma.maintenanceRequest.count({
                where: {
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                    property: { entity: { organizationId: id } },
                },
            }),
        ]);

        // Calculate occupancy rate
        const occupancyRate = totalSpaces > 0 ? (activeLeases / totalSpaces) * 100 : 0;

        return {
            organization: {
                id: organization.id,
                name: organization.name,
            },
            stats: {
                totalEntities,
                totalProperties,
                totalSpaces,
                activeLeases,
                totalUsers,
                pendingMaintenanceRequests: maintenanceRequests,
                occupancyRate: Math.round(occupancyRate * 100) / 100,
            },
        };
    }
}