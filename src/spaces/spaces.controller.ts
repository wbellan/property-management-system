// src/spaces/spaces.controller.ts
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

import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpaceQueryDto } from './dto/space-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Spaces')
@Controller('spaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SpacesController {
    constructor(private readonly spacesService: SpacesService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Create a new space/unit' })
    @ApiResponse({ status: 201, description: 'Space created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    create(
        @Body() createSpaceDto: CreateSpaceDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.spacesService.create(createSpaceDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Get all spaces' })
    @ApiResponse({ status: 200, description: 'Spaces retrieved successfully' })
    findAll(
        @Query() query: SpaceQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.spacesService.findAll(query, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get('available')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Get all available spaces (no active lease)' })
    @ApiResponse({ status: 200, description: 'Available spaces retrieved successfully' })
    getAvailableSpaces(
        @Query('propertyId') propertyId: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.spacesService.getAvailableSpaces(propertyId, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get('by-property/:propertyId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Get all spaces for a specific property' })
    @ApiResponse({ status: 200, description: 'Spaces retrieved successfully' })
    getSpacesByProperty(
        @Param('propertyId') propertyId: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.spacesService.getSpacesByProperty(propertyId, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Get space by ID' })
    @ApiResponse({ status: 200, description: 'Space retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Space not found' })
    findOne(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.spacesService.findOne(id, userRole, userOrgId, entityIds, propertyIds);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Update space' })
    @ApiResponse({ status: 200, description: 'Space updated successfully' })
    @ApiResponse({ status: 404, description: 'Space not found' })
    update(
        @Param('id') id: string,
        @Body() updateSpaceDto: UpdateSpaceDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.spacesService.update(id, updateSpaceDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Delete space' })
    @ApiResponse({ status: 200, description: 'Space deleted successfully' })
    @ApiResponse({ status: 404, description: 'Space not found' })
    remove(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.spacesService.remove(id, userRole, userOrgId, entityIds, propertyIds);
    }
}