// src/entities/entities.controller.ts
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

import { EntitiesService } from './entities.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { EntityQueryDto } from './dto/entity-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Entities')
@Controller('entities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EntitiesController {
    constructor(private readonly entitiesService: EntitiesService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    @ApiOperation({ summary: 'Create a new entity' })
    @ApiResponse({ status: 201, description: 'Entity created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    create(
        @Body() createEntityDto: CreateEntityDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
    ) {
        return this.entitiesService.create(createEntityDto, userRole, userOrgId);
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Get all entities' })
    @ApiResponse({ status: 200, description: 'Entities retrieved successfully' })
    findAll(
        @Query() query: EntityQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.entitiesService.findAll(query, userRole, userOrgId, entityIds);
    }

    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Get entity by ID' })
    @ApiResponse({ status: 200, description: 'Entity retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Entity not found' })
    findOne(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.entitiesService.findOne(id, userRole, userOrgId, entityIds);
    }

    @Get(':id/stats')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Get entity statistics' })
    @ApiResponse({ status: 200, description: 'Entity stats retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Entity not found' })
    getStats(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.entitiesService.getEntityStats(id, userRole, userOrgId, entityIds);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Update entity' })
    @ApiResponse({ status: 200, description: 'Entity updated successfully' })
    @ApiResponse({ status: 404, description: 'Entity not found' })
    update(
        @Param('id') id: string,
        @Body() updateEntityDto: UpdateEntityDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.entitiesService.update(id, updateEntityDto, userRole, userOrgId, entityIds);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    @ApiOperation({ summary: 'Delete entity' })
    @ApiResponse({ status: 200, description: 'Entity deleted successfully' })
    @ApiResponse({ status: 404, description: 'Entity not found' })
    remove(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
    ) {
        return this.entitiesService.remove(id, userRole, userOrgId);
    }
}