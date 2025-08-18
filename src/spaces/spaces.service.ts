// src/spaces/spaces.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpaceQueryDto } from './dto/space-query.dto';

@Injectable()
export class SpacesService {
  constructor(private prisma: PrismaService) { }

  async create(createSpaceDto: CreateSpaceDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    // Check permissions
    if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.PROPERTY_MANAGER) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Verify property exists and user has access
    const property = await this.prisma.property.findUnique({
      where: { id: createSpaceDto.propertyId },
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
      if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(createSpaceDto.propertyId)) {
        throw new ForbiddenException('No access to this property');
      }
    }

    // Check if unit number already exists in this property
    const existingSpace = await this.prisma.space.findUnique({
      where: {
        propertyId_unitNumber: {
          propertyId: createSpaceDto.propertyId,
          unitNumber: createSpaceDto.unitNumber,
        },
      },
    });

    if (existingSpace) {
      throw new BadRequestException(`Unit number ${createSpaceDto.unitNumber} already exists in this property`);
    }

    const space = await this.prisma.space.create({
      data: createSpaceDto,
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
        _count: {
          select: {
            leases: true,
          },
        },
      },
    });

    return space;
  }

  async findAll(query: SpaceQueryDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    const { page, limit, search, spaceType, bedrooms, floor, available, propertyId } = query;

    // Build where clause based on user permissions
    let where: any = {};

    if (userRole === UserRole.SUPER_ADMIN) {
      // Super admin can see all spaces
    } else if (userRole === UserRole.ORG_ADMIN) {
      // Org admin can see all spaces in their organization
      where.property = { entity: { organizationId: userOrgId } };
    } else if (userRole === UserRole.ENTITY_MANAGER) {
      // Entity manager can see spaces of properties they manage
      where.property = { entityId: { in: userEntities } };
    } else if (userRole === UserRole.PROPERTY_MANAGER) {
      // Property manager can only see spaces in properties they manage
      where.propertyId = { in: userProperties };
    } else {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Add filters
    if (search) {
      where.OR = [
        { unitNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { property: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (spaceType) {
      where.spaceType = spaceType;
    }

    if (bedrooms !== undefined) {
      where.bedrooms = bedrooms;
    }

    if (floor !== undefined) {
      where.floor = floor;
    }

    if (available !== undefined) {
      if (available) {
        // Available means no active lease
        where.leases = {
          none: { status: 'ACTIVE' },
        };
      } else {
        // Not available means has active lease
        where.leases = {
          some: { status: 'ACTIVE' },
        };
      }
    }

    if (propertyId) {
      // Verify user has access to this property
      await this.verifyPropertyAccess(propertyId, userRole, userOrgId, userEntities, userProperties);
      where.propertyId = propertyId;
    }

    return this.prisma.paginate(this.prisma.space, {
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
        leases: {
          where: { status: 'ACTIVE' },
          include: {
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
        _count: {
          select: {
            leases: true,
            maintenanceReqs: true,
          },
        },
      },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
    });
  }

  async findOne(id: string, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    const space = await this.prisma.space.findUnique({
      where: { id },
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
                organizationId: true,
              },
            },
          },
        },
        leases: {
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
          orderBy: { createdAt: 'desc' },
        },
        maintenanceReqs: {
          include: {
            tenant: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 maintenance requests
        },
        _count: {
          select: {
            leases: true,
            maintenanceReqs: true,
          },
        },
      },
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check access permissions
    if (userRole !== UserRole.SUPER_ADMIN) {
      if (userRole === UserRole.ORG_ADMIN && space.property.entity.organizationId !== userOrgId) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(space.property.entity.id)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(space.propertyId)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return space;
  }

  async update(id: string, updateSpaceDto: UpdateSpaceDto, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    // Check permissions
    if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER && userRole !== UserRole.PROPERTY_MANAGER) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const space = await this.prisma.space.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
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

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check access permissions
    if (userRole !== UserRole.SUPER_ADMIN) {
      if (userRole === UserRole.ORG_ADMIN && space.property.entity.organizationId !== userOrgId) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(space.property.entity.id)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.PROPERTY_MANAGER && !userProperties.includes(space.propertyId)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // If updating unit number, check for conflicts
    if (updateSpaceDto.unitNumber && updateSpaceDto.unitNumber !== space.unitNumber) {
      const existingSpace = await this.prisma.space.findUnique({
        where: {
          propertyId_unitNumber: {
            propertyId: space.propertyId,
            unitNumber: updateSpaceDto.unitNumber,
          },
        },
      });

      if (existingSpace) {
        throw new BadRequestException(`Unit number ${updateSpaceDto.unitNumber} already exists in this property`);
      }
    }

    const updatedSpace = await this.prisma.space.update({
      where: { id },
      data: updateSpaceDto,
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
        _count: {
          select: {
            leases: true,
          },
        },
      },
    });

    return updatedSpace;
  }

  async remove(id: string, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    // Only higher-level roles can delete spaces
    if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ORG_ADMIN && userRole !== UserRole.ENTITY_MANAGER) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const space = await this.prisma.space.findUnique({
      where: { id },
      include: {
        property: {
          select: {
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
            leases: true,
          },
        },
      },
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check access permissions
    if (userRole !== UserRole.SUPER_ADMIN) {
      if (userRole === UserRole.ORG_ADMIN && space.property.entity.organizationId !== userOrgId) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (userRole === UserRole.ENTITY_MANAGER && !userEntities.includes(space.property.entity.id)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Check if space has active leases
    const activeLeases = await this.prisma.lease.count({
      where: {
        spaceId: id,
        status: 'ACTIVE',
      },
    });

    if (activeLeases > 0) {
      throw new BadRequestException('Cannot delete space with active leases. End leases first.');
    }

    await this.prisma.space.delete({
      where: { id },
    });

    return { message: 'Space deleted successfully' };
  }

  async getSpacesByProperty(propertyId: string, userRole: UserRole, userOrgId: string, userEntities: string[], userProperties: string[]) {
    // Verify property access
    await this.verifyPropertyAccess(propertyId, userRole, userOrgId, userEntities, userProperties);

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        name: true,
        address: true,
      },
    });

    const spaces = await this.prisma.space.findMany({
      where: { propertyId },
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
              },
            },
          },
        },
        _count: {
          select: {
            leases: true,
            maintenanceReqs: true,
          },
        },
      },
      orderBy: { unitNumber: 'asc' },
    });

    const stats = {
      total: spaces.length,
      occupied: spaces.filter(s => s.leases.length > 0).length,
      available: spaces.filter(s => s.leases.length === 0).length,
    };

    return {
      property,
      spaces,
      stats,
    };
  }

  async getAvailableSpaces(propertyId?: string, userRole?: UserRole, userOrgId?: string, userEntities?: string[], userProperties?: string[]) {
    let where: any = {
      leases: {
        none: { status: 'ACTIVE' },
      },
    };

    // Apply property filter if specified
    if (propertyId) {
      await this.verifyPropertyAccess(propertyId, userRole, userOrgId, userEntities, userProperties);
      where.propertyId = propertyId;
    } else {
      // Apply general access controls
      if (userRole !== UserRole.SUPER_ADMIN) {
        if (userRole === UserRole.ORG_ADMIN) {
          where.property = { entity: { organizationId: userOrgId } };
        } else if (userRole === UserRole.ENTITY_MANAGER) {
          where.property = { entityId: { in: userEntities } };
        } else if (userRole === UserRole.PROPERTY_MANAGER) {
          where.propertyId = { in: userProperties };
        }
      }
    }

    const availableSpaces = await this.prisma.space.findMany({
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
      },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
    });

    return availableSpaces;
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

    // Check access permissions
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
}
