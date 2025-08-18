// src/organizations/organizations.controller.ts
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

import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationQueryDto } from './dto/organization-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Create a new organization (Super Admin only)' })
    @ApiResponse({ status: 201, description: 'Organization created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    create(@Body() createOrganizationDto: CreateOrganizationDto) {
        return this.organizationsService.create(createOrganizationDto);
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get all organizations (Super Admin only)' })
    @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
    findAll(
        @Query() query: OrganizationQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
    ) {
        return this.organizationsService.findAll(query, userRole, userOrgId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get organization by ID' })
    @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    findOne(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
    ) {
        return this.organizationsService.findOne(id, userRole, userOrgId);
    }

    @Get(':id/stats')
    @ApiOperation({ summary: 'Get organization statistics' })
    @ApiResponse({ status: 200, description: 'Organization stats retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    getStats(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
    ) {
        return this.organizationsService.getOrganizationStats(id, userRole, userOrgId);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    @ApiOperation({ summary: 'Update organization' })
    @ApiResponse({ status: 200, description: 'Organization updated successfully' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    update(
        @Param('id') id: string,
        @Body() updateOrganizationDto: UpdateOrganizationDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
    ) {
        return this.organizationsService.update(id, updateOrganizationDto, userRole, userOrgId);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Delete organization (Super Admin only)' })
    @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    remove(@Param('id') id: string, @CurrentUser('role') userRole: UserRole) {
        return this.organizationsService.remove(id, userRole);
    }
}