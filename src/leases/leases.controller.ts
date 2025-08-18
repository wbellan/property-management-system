// src/leases/leases.controller.ts
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

import { LeasesService } from './leases.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { LeaseQueryDto } from './dto/lease-query.dto';
import { RenewLeaseDto } from './dto/renew-lease.dto';
import { RentIncreaseDto } from './dto/rent-increase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Leases')
@Controller('leases')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LeasesController {
    constructor(private readonly leasesService: LeasesService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Create a new lease' })
    @ApiResponse({ status: 201, description: 'Lease created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 400, description: 'Space already has active lease or invalid data' })
    create(
        @Body() createLeaseDto: CreateLeaseDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.leasesService.create(createLeaseDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.TENANT)
    @ApiOperation({ summary: 'Get all leases' })
    @ApiResponse({ status: 200, description: 'Leases retrieved successfully' })
    findAll(
        @Query() query: LeaseQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.leasesService.findAll(query, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get('expiring')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Get leases expiring within specified days (default 30)' })
    @ApiResponse({ status: 200, description: 'Expiring leases retrieved successfully' })
    getExpiringLeases(
        @Query('days') days: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        const daysInt = days ? parseInt(days) : 30;
        return this.leasesService.getExpiringLeases(userRole, userOrgId, entityIds, propertyIds, daysInt);
    }

    @Get('by-tenant/:tenantId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Get all leases for a specific tenant' })
    @ApiResponse({ status: 200, description: 'Tenant leases retrieved successfully' })
    getLeasesByTenant(
        @Param('tenantId') tenantId: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
    ) {
        return this.leasesService.getLeasesByTenant(tenantId, userRole, userOrgId);
    }

    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.TENANT)
    @ApiOperation({ summary: 'Get lease by ID' })
    @ApiResponse({ status: 200, description: 'Lease retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Lease not found' })
    findOne(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.leasesService.findOne(id, userRole, userOrgId, entityIds, propertyIds);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Update lease' })
    @ApiResponse({ status: 200, description: 'Lease updated successfully' })
    @ApiResponse({ status: 404, description: 'Lease not found' })
    update(
        @Param('id') id: string,
        @Body() updateLeaseDto: UpdateLeaseDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.leasesService.update(id, updateLeaseDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Post(':id/renew')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Renew a lease' })
    @ApiResponse({ status: 200, description: 'Lease renewed successfully' })
    @ApiResponse({ status: 404, description: 'Lease not found' })
    @ApiResponse({ status: 400, description: 'Cannot renew inactive lease' })
    renewLease(
        @Param('id') id: string,
        @Body() renewLeaseDto: RenewLeaseDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.leasesService.renewLease(id, renewLeaseDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Post(':id/rent-increase')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Add a rent increase to a lease' })
    @ApiResponse({ status: 200, description: 'Rent increase added successfully' })
    @ApiResponse({ status: 404, description: 'Lease not found' })
    @ApiResponse({ status: 400, description: 'Invalid rent increase data' })
    addRentIncrease(
        @Param('id') id: string,
        @Body() rentIncreaseDto: RentIncreaseDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.leasesService.addRentIncrease(id, rentIncreaseDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Post(':id/terminate')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Terminate a lease' })
    @ApiResponse({ status: 200, description: 'Lease terminated successfully' })
    @ApiResponse({ status: 404, description: 'Lease not found' })
    @ApiResponse({ status: 400, description: 'Cannot terminate inactive lease' })
    terminateLease(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.leasesService.terminateLease(id, userRole, userOrgId, entityIds, propertyIds);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Delete lease (only for non-active leases without payments)' })
    @ApiResponse({ status: 200, description: 'Lease deleted successfully' })
    @ApiResponse({ status: 404, description: 'Lease not found' })
    @ApiResponse({ status: 400, description: 'Cannot delete active lease or lease with payments' })
    remove(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.leasesService.remove(id, userRole, userOrgId, entityIds);
    }
}