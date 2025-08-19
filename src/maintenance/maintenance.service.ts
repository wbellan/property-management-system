// src/maintenance/maintenance.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
    constructor(private prisma: PrismaService) { }

    // ============= MAINTENANCE REQUESTS =============

    async createMaintenanceRequest(createMaintenanceRequestDto: any, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        // Verify property exists and user has access
        const property = await this.prisma.property.findUnique({
            where: { id: createMaintenanceRequestDto.propertyId },
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

        // Check property access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && property.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Property belongs to different organization');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(property.entityId)) {
                throw new ForbiddenException('No access to this property entity');
            }
            if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(createMaintenanceRequestDto.propertyId)) {
                throw new ForbiddenException('No access to this property');
            }
        }

        // Verify space if provided
        if (createMaintenanceRequestDto.spaceId) {
            const space = await this.prisma.space.findUnique({
                where: { id: createMaintenanceRequestDto.spaceId },
            });

            if (!space || space.propertyId !== createMaintenanceRequestDto.propertyId) {
                throw new BadRequestException('Space does not belong to the specified property');
            }
        }

        // Verify tenant exists and belongs to same organization
        const tenant = await this.prisma.user.findUnique({
            where: { id: createMaintenanceRequestDto.tenantId },
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

        const maintenanceRequest = await this.prisma.maintenanceRequest.create({
            data: createMaintenanceRequestDto,
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
                space: {
                    select: {
                        id: true,
                        unitNumber: true,
                        spaceType: true,
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
                assignments: {
                    include: {
                        vendor: {
                            select: {
                                id: true,
                                name: true,
                                vendorType: true,
                                contactName: true,
                                phone: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        return maintenanceRequest;
    }

    async findAllMaintenanceRequests(query: any, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        const { page, limit, search, status, priority, propertyId, spaceId, tenantId } = query;

        // Build where clause based on user permissions
        let where: any = {};

        if (userRole === UserRole.SUPER_ADMIN) {
            // Super admin can see all maintenance requests
        } else if (userRole === UserRole.ORG_ADMIN || userRole === UserRole.MAINTENANCE) {
            // Org admin and maintenance staff can see all requests in their organization
            where.property = { entity: { organizationId: userOrgId } };
        } else if (userRole === UserRole.ENTITY_MANAGER) {
            // Entity manager can see requests for properties they manage
            where.property = { entityId: { in: userEntities } };
        } else if (userRole === UserRole.PROPERTY_MANAGER) {
            // Property manager can see requests for their properties
            where.propertyId = { in: userProperties };
        } else if (userRole === UserRole.TENANT) {
            // Tenants can only see their own requests
            where.tenantId = userOrgId;
        } else {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Add filters
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { tenant: { firstName: { contains: search, mode: 'insensitive' } } },
                { tenant: { lastName: { contains: search, mode: 'insensitive' } } },
                { property: { name: { contains: search, mode: 'insensitive' } } },
                { space: { unitNumber: { contains: search, mode: 'insensitive' } } },
            ];
        }

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        if (propertyId) {
            await this.verifyPropertyAccess(propertyId, userRole, userOrgId, userEntities, userProperties);
            where.propertyId = propertyId;
        }

        if (spaceId) {
            where.spaceId = spaceId;
        }

        if (tenantId) {
            where.tenantId = tenantId;
        }

        return this.prisma.paginate(this.prisma.maintenanceRequest, {
            page,
            limit,
            where,
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
                space: {
                    select: {
                        id: true,
                        unitNumber: true,
                        spaceType: true,
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
                assignments: {
                    include: {
                        vendor: {
                            select: {
                                id: true,
                                name: true,
                                vendorType: true,
                                contactName: true,
                            },
                        },
                    },
                    orderBy: { assignedAt: 'desc' },
                    take: 1, // Latest assignment
                },
                _count: {
                    select: {
                        assignments: true,
                    },
                },
            },
            orderBy: [
                { priority: 'desc' },
                { requestedAt: 'desc' },
            ],
        });
    }

    async getMaintenanceRequestsByProperty(propertyId: string, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        await this.verifyPropertyAccess(propertyId, userRole, userOrgId, userEntities, userProperties);

        const requests = await this.prisma.maintenanceRequest.findMany({
            where: { propertyId },
            include: {
                property: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
                space: {
                    select: {
                        id: true,
                        unitNumber: true,
                        spaceType: true,
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
                assignments: {
                    include: {
                        vendor: {
                            select: {
                                id: true,
                                name: true,
                                vendorType: true,
                                contactName: true,
                            },
                        },
                    },
                    orderBy: { assignedAt: 'desc' },
                },
            },
            orderBy: [
                { priority: 'desc' },
                { requestedAt: 'desc' },
            ],
        });

        return requests;
    }

    async findOneMaintenanceRequest(id: string, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        const maintenanceRequest = await this.prisma.maintenanceRequest.findUnique({
            where: { id },
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
                space: {
                    select: {
                        id: true,
                        unitNumber: true,
                        spaceType: true,
                        bedrooms: true,
                        bathrooms: true,
                        squareFeet: true,
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
                assignments: {
                    include: {
                        vendor: true,
                    },
                    orderBy: { assignedAt: 'desc' },
                },
            },
        });

        if (!maintenanceRequest) {
            throw new NotFoundException('Maintenance request not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && maintenanceRequest.property.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(maintenanceRequest.property.entity.id)) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(maintenanceRequest.propertyId)) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.TENANT && maintenanceRequest.tenantId !== userOrgId) {
                throw new ForbiddenException('Can only view your own maintenance requests');
            }
        }

        return maintenanceRequest;
    }

    async updateMaintenanceRequest(id: string, updateMaintenanceRequestDto: any, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        const maintenanceRequest = await this.prisma.maintenanceRequest.findUnique({
            where: { id },
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
        });

        if (!maintenanceRequest) {
            throw new NotFoundException('Maintenance request not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && maintenanceRequest.property.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(maintenanceRequest.property.entity.id)) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(maintenanceRequest.propertyId)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        // Handle status completion
        if (updateMaintenanceRequestDto.status === 'COMPLETED' && maintenanceRequest.status !== 'COMPLETED') {
            updateMaintenanceRequestDto.completedAt = new Date();
        }

        const updatedRequest = await this.prisma.maintenanceRequest.update({
            where: { id },
            data: updateMaintenanceRequestDto,
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
                space: {
                    select: {
                        id: true,
                        unitNumber: true,
                        spaceType: true,
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
                assignments: {
                    include: {
                        vendor: true,
                    },
                    orderBy: { assignedAt: 'desc' },
                },
            },
        });

        return updatedRequest;
    }

    async assignMaintenanceToVendor(id: string, assignMaintenanceDto: any, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        // Find the maintenance request and verify access
        const maintenanceRequest = await this.findOneMaintenanceRequest(id, userRole, userOrgId, userEntities, userProperties);

        // Verify vendor exists and belongs to the same entity
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: assignMaintenanceDto.vendorId },
            include: {
                entity: {
                    select: {
                        id: true,
                        organizationId: true,
                    },
                },
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        if (!vendor.isActive) {
            throw new BadRequestException('Vendor is not active');
        }

        // Verify vendor belongs to the same entity as the property
        if (vendor.entityId !== maintenanceRequest.property.entity.id) {
            throw new BadRequestException('Vendor belongs to different entity');
        }

        // Create the assignment
        const assignment = await this.prisma.maintenanceAssignment.create({
            data: {
                maintenanceReqId: id,
                vendorId: assignMaintenanceDto.vendorId,
                scheduledDate: assignMaintenanceDto.scheduledDate ? new Date(assignMaintenanceDto.scheduledDate) : null,
                notes: assignMaintenanceDto.notes,
            },
            include: {
                vendor: true,
                maintenanceRequest: {
                    include: {
                        property: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                            },
                        },
                        space: {
                            select: {
                                id: true,
                                unitNumber: true,
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

        // Update maintenance request status to IN_PROGRESS if it was OPEN
        if (maintenanceRequest.status === 'OPEN') {
            await this.prisma.maintenanceRequest.update({
                where: { id },
                data: { status: 'IN_PROGRESS' },
            });
        }

        return assignment;
    }

    async completeMaintenanceAssignment(assignmentId: string, completionData: any, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
        // Find the assignment
        const assignment = await this.prisma.maintenanceAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                maintenanceRequest: {
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
                vendor: true,
            },
        });

        if (!assignment) {
            throw new NotFoundException('Maintenance assignment not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && assignment.maintenanceRequest.property.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(assignment.maintenanceRequest.property.entity.id)) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(assignment.maintenanceRequest.propertyId)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        // Complete the assignment
        const completedAssignment = await this.prisma.maintenanceAssignment.update({
            where: { id: assignmentId },
            data: {
                completedAt: new Date(),
                cost: completionData.cost ? parseFloat(completionData.cost) : null,
                notes: completionData.notes || assignment.notes,
            },
            include: {
                vendor: true,
                maintenanceRequest: true,
            },
        });

        // Update the maintenance request
        const updateData: any = {
            status: 'COMPLETED',
            completedAt: new Date(),
        };

        if (completionData.cost) {
            updateData.actualCost = parseFloat(completionData.cost);
        }

        await this.prisma.maintenanceRequest.update({
            where: { id: assignment.maintenanceReqId },
            data: updateData,
        });

        return completedAssignment;
    }

    async deleteMaintenanceRequest(id: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        // Only higher-level roles can delete maintenance requests
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const maintenanceRequest = await this.prisma.maintenanceRequest.findUnique({
            where: { id },
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
                _count: {
                    select: {
                        assignments: true,
                    },
                },
            },
        });

        if (!maintenanceRequest) {
            throw new NotFoundException('Maintenance request not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && maintenanceRequest.property.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(maintenanceRequest.property.entity.id)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        // Check if request has assignments
        if (maintenanceRequest._count.assignments > 0) {
            throw new BadRequestException('Cannot delete maintenance request with existing assignments');
        }

        await this.prisma.maintenanceRequest.delete({
            where: { id },
        });

        return { message: 'Maintenance request deleted successfully' };
    }

    // ============= VENDORS =============

    async createVendor(createVendorDto: any, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        // Check permissions
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.MAINTENANCE) {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Verify entity access
        await this.verifyEntityAccess(createVendorDto.entityId, userRole, userOrgId, userEntities);

        const vendor = await this.prisma.vendor.create({
            data: createVendorDto,
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
                        maintenanceAssignments: true,
                    },
                },
            },
        });

        return vendor;
    }

    async findAllVendors(query: any, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        const { page, limit, search, vendorType, isActive, entityId } = query;

        // Build where clause based on user permissions
        let where: any = {};

        if (userRole === UserRole.SUPER_ADMIN) {
            // Super admin can see all vendors
        } else if (userRole === UserRole.ORG_ADMIN || userRole === UserRole.MAINTENANCE) {
            // Org admin and maintenance can see all vendors in their organization
            where.entity = { organizationId: userOrgId };
        } else if (userRole === UserRole.ENTITY_MANAGER) {
            // Entity manager can see vendors for entities they manage
            where.entityId = { in: userEntities };
        } else {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Add filters
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { vendorType: { contains: search, mode: 'insensitive' } },
                { contactName: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (vendorType) {
            where.vendorType = { contains: vendorType, mode: 'insensitive' };
        }

        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        if (entityId) {
            await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);
            where.entityId = entityId;
        }

        return this.prisma.paginate(this.prisma.vendor, {
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
                        maintenanceAssignments: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOneVendor(id: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
            include: {
                entity: {
                    select: {
                        id: true,
                        name: true,
                        organizationId: true,
                        organization: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                maintenanceAssignments: {
                    include: {
                        maintenanceRequest: {
                            include: {
                                property: {
                                    select: {
                                        id: true,
                                        name: true,
                                        address: true,
                                    },
                                },
                                space: {
                                    select: {
                                        id: true,
                                        unitNumber: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { assignedAt: 'desc' },
                    take: 10, // Last 10 assignments
                },
                _count: {
                    select: {
                        maintenanceAssignments: true,
                    },
                },
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && vendor.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(vendor.entityId)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        return vendor;
    }

    async updateVendor(id: string, updateVendorDto: any, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
            include: {
                entity: {
                    select: {
                        id: true,
                        organizationId: true,
                    },
                },
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && vendor.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(vendor.entityId)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        const updatedVendor = await this.prisma.vendor.update({
            where: { id },
            data: updateVendorDto,
            include: {
                entity: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        maintenanceAssignments: true,
                    },
                },
            },
        });

        return updatedVendor;
    }

    async deleteVendor(id: string, userRole: UserRole, userOrgId: string, userEntities: string[]) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
            include: {
                entity: {
                    select: {
                        id: true,
                        organizationId: true,
                    },
                },
                _count: {
                    select: {
                        maintenanceAssignments: true,
                    },
                },
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Check access permissions
        if (userRole !== UserRole.SUPER_ADMIN) {
            if (userRole === UserRole.ORG_ADMIN && vendor.entity.organizationId !== userOrgId) {
                throw new ForbiddenException('Insufficient permissions');
            }
            if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(vendor.entityId)) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        // Check if vendor has assignments
        if (vendor._count.maintenanceAssignments > 0) {
            throw new BadRequestException('Cannot delete vendor with existing assignments');
        }

        await this.prisma.vendor.delete({
            where: { id },
        });

        return { message: 'Vendor deleted successfully' };
    }

    // ============= REPORTS =============

    async getMaintenanceStats(entityId: string, userRole: UserRole, userOrgId: string, userEntities: string[], startDate?: string, endDate?: string) {
        // Verify entity access
        await this.verifyEntityAccess(entityId, userRole, userOrgId, userEntities);

        // Build where clause for stats
        let where: any = {
            property: { entityId }
        };

        if (startDate) {
            where.requestedAt = { ...where.requestedAt, gte: new Date(startDate) };
        }

        if (endDate) {
            where.requestedAt = { ...where.requestedAt, lte: new Date(endDate) };
        }

        const [
            totalRequests,
            openRequests,
            inProgressRequests,
            completedRequests,
            cancelledRequests,
            emergencyRequests,
            costStats,
            avgCompletionTime,
            topVendors,
        ] = await Promise.all([
            this.prisma.maintenanceRequest.count({ where }),
            this.prisma.maintenanceRequest.count({ where: { ...where, status: 'OPEN' } }),
            this.prisma.maintenanceRequest.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            this.prisma.maintenanceRequest.count({ where: { ...where, status: 'COMPLETED' } }),
            this.prisma.maintenanceRequest.count({ where: { ...where, status: 'CANCELLED' } }),
            this.prisma.maintenanceRequest.count({ where: { ...where, priority: 'EMERGENCY' } }),
            this.prisma.maintenanceRequest.aggregate({
                where: { ...where, actualCost: { not: null } },
                _sum: { actualCost: true },
                _avg: { actualCost: true },
            }),
            this.calculateAverageCompletionTime(where),
            this.getTopVendorsByEntity(entityId),
        ]);

        const entity = await this.prisma.entity.findUnique({
            where: { id: entityId },
            select: { id: true, name: true },
        });

        return {
            entity: {
                id: entity.id,
                name: entity.name,
            },
            period: {
                startDate: startDate || null,
                endDate: endDate || null,
            },
            summary: {
                total: totalRequests,
                open: openRequests,
                inProgress: inProgressRequests,
                completed: completedRequests,
                cancelled: cancelledRequests,
                emergency: emergencyRequests,
                avgCompletionTimeHours: avgCompletionTime,
            },
            costs: {
                total: costStats._sum.actualCost || 0,
                average: costStats._avg.actualCost || 0,
            },
            topVendors,
        };
    }

    // ============= HELPER METHODS =============

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

    private async calculateAverageCompletionTime(where: any): Promise<number> {
        const completedRequests = await this.prisma.maintenanceRequest.findMany({
            where: {
                ...where,
                status: 'COMPLETED',
                completedAt: { not: null },
            },
            select: {
                requestedAt: true,
                completedAt: true,
            },
        });

        if (completedRequests.length === 0) return 0;

        const totalTime = completedRequests.reduce((sum, request) => {
            const completionTime = new Date(request.completedAt!).getTime() - new Date(request.requestedAt).getTime();
            return sum + completionTime;
        }, 0);

        return Math.round(totalTime / completedRequests.length / (1000 * 60 * 60)); // Convert to hours
    }

    private async getTopVendorsByEntity(entityId: string) {
        const vendorStats = await this.prisma.maintenanceAssignment.groupBy({
            by: ['vendorId'],
            where: {
                maintenanceRequest: {
                    property: { entityId },
                },
            },
            _count: { id: true },
            _avg: { cost: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
        });

        const vendorIds = vendorStats.map(stat => stat.vendorId);

        if (vendorIds.length === 0) return [];

        const vendors = await this.prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
            select: {
                id: true,
                name: true,
                vendorType: true,
            },
        });

        return vendorStats.map(stat => {
            const vendor = vendors.find(v => v.id === stat.vendorId);
            return {
                vendorId: stat.vendorId,
                vendorName: vendor?.name || 'Unknown',
                vendorType: vendor?.vendorType || 'Unknown',
                assignmentCount: stat._count.id,
                avgCost: stat._avg.cost || 0,
            };
        });
    }
}