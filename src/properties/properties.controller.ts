// src/properties/properties.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Properties')
@Controller('properties')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PropertiesController {
    constructor(private readonly propertiesService: PropertiesService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Create a new property' })
    @ApiResponse({ status: 201, description: 'Property created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    create(
        @Body() createPropertyDto: CreatePropertyDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.propertiesService.create(createPropertyDto, userRole, userOrgId, entityIds);
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Get all properties' })
    @ApiResponse({ status: 200, description: 'Properties retrieved successfully' })
    findAll(
        @Query() query: PropertyQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.propertiesService.findAll(query, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get('by-entity/:entityId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Get all properties for a specific entity' })
    @ApiResponse({ status: 200, description: 'Properties retrieved successfully' })
    getPropertiesByEntity(
        @Param('entityId') entityId: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.propertiesService.getPropertiesByEntity(entityId, userRole, userOrgId, entityIds);
    }

    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Get property by ID' })
    @ApiResponse({ status: 200, description: 'Property retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Property not found' })
    findOne(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.propertiesService.findOne(id, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get(':id/stats')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Get property statistics' })
    @ApiResponse({ status: 200, description: 'Property stats retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Property not found' })
    getStats(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.propertiesService.getPropertyStats(id, userRole, userOrgId, entityIds, propertyIds);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Update property' })
    @ApiResponse({ status: 200, description: 'Property updated successfully' })
    @ApiResponse({ status: 404, description: 'Property not found' })
    update(
        @Param('id') id: string,
        @Body() updatePropertyDto: UpdatePropertyDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.propertiesService.update(id, updatePropertyDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Delete property' })
    @ApiResponse({ status: 200, description: 'Property deleted successfully' })
    @ApiResponse({ status: 404, description: 'Property not found' })
    remove(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.propertiesService.remove(id, userRole, userOrgId, entityIds);
    }
}