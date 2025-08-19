// src/maintenance/maintenance.controller.ts
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

import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';
import { AssignMaintenanceDto } from './dto/assign-maintenance.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { MaintenanceQueryDto, VendorQueryDto } from './dto/maintenance-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) { }

    // ============= MAINTENANCE REQUESTS =============

    @Post('requests')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.MAINTENANCE, UserRole.TENANT)
    @ApiOperation({ summary: 'Create a new maintenance request' })
    @ApiResponse({ status: 201, description: 'Maintenance request created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 400, description: 'Space does not belong to property or invalid tenant' })
    createMaintenanceRequest(
        @Body() createMaintenanceRequestDto: CreateMaintenanceRequestDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.maintenanceService.createMaintenanceRequest(createMaintenanceRequestDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get('requests')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.MAINTENANCE, UserRole.TENANT)
    @ApiOperation({ summary: 'Get all maintenance requests' })
    @ApiResponse({ status: 200, description: 'Maintenance requests retrieved successfully' })
    findAllMaintenanceRequests(
        @Query() query: MaintenanceQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.maintenanceService.findAllMaintenanceRequests(query, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get('requests/by-property/:propertyId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.MAINTENANCE)
    @ApiOperation({ summary: 'Get all maintenance requests for a specific property' })
    @ApiResponse({ status: 200, description: 'Property maintenance requests retrieved successfully' })
    getMaintenanceRequestsByProperty(
        @Param('propertyId') propertyId: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.maintenanceService.getMaintenanceRequestsByProperty(propertyId, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get('requests/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.MAINTENANCE, UserRole.TENANT)
    @ApiOperation({ summary: 'Get maintenance request by ID' })
    @ApiResponse({ status: 200, description: 'Maintenance request retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Maintenance request not found' })
    findOneMaintenanceRequest(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.maintenanceService.findOneMaintenanceRequest(id, userRole, userOrgId, entityIds, propertyIds);
    }

    @Patch('requests/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.MAINTENANCE)
    @ApiOperation({ summary: 'Update maintenance request' })
    @ApiResponse({ status: 200, description: 'Maintenance request updated successfully' })
    @ApiResponse({ status: 404, description: 'Maintenance request not found' })
    updateMaintenanceRequest(
        @Param('id') id: string,
        @Body() updateMaintenanceRequestDto: UpdateMaintenanceRequestDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.maintenanceService.updateMaintenanceRequest(id, updateMaintenanceRequestDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Post('requests/:id/assign')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.MAINTENANCE)
    @ApiOperation({ summary: 'Assign maintenance request to vendor' })
    @ApiResponse({ status: 200, description: 'Maintenance request assigned successfully' })
    @ApiResponse({ status: 404, description: 'Maintenance request or vendor not found' })
    @ApiResponse({ status: 400, description: 'Vendor belongs to different entity or is inactive' })
    assignMaintenanceToVendor(
        @Param('id') id: string,
        @Body() assignMaintenanceDto: AssignMaintenanceDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.maintenanceService.assignMaintenanceToVendor(id, assignMaintenanceDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Post('assignments/:assignmentId/complete')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.MAINTENANCE)
    @ApiOperation({ summary: 'Complete maintenance assignment' })
    @ApiResponse({ status: 200, description: 'Maintenance assignment completed successfully' })
    @ApiResponse({ status: 404, description: 'Maintenance assignment not found' })
    completeMaintenanceAssignment(
        @Param('assignmentId') assignmentId: string,
        @Body() completionData: { cost?: number; notes?: string },
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.maintenanceService.completeMaintenanceAssignment(assignmentId, completionData, userRole, userOrgId, entityIds, propertyIds);
    }

    @Delete('requests/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Delete maintenance request' })
    @ApiResponse({ status: 200, description: 'Maintenance request deleted successfully' })
    @ApiResponse({ status: 404, description: 'Maintenance request not found' })
    deleteMaintenanceRequest(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.maintenanceService.deleteMaintenanceRequest(id, userRole, userOrgId, entityIds);
    }

    // ============= VENDORS =============

    @Post('vendors')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.MAINTENANCE)
    @ApiOperation({ summary: 'Create a new vendor' })
    @ApiResponse({ status: 201, description: 'Vendor created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    createVendor(
        @Body() createVendorDto: CreateVendorDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.maintenanceService.createVendor(createVendorDto, userRole, userOrgId, entityIds);
    }

    @Get('vendors')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.MAINTENANCE)
    @ApiOperation({ summary: 'Get all vendors' })
    @ApiResponse({ status: 200, description: 'Vendors retrieved successfully' })
    findAllVendors(
        @Query() query: VendorQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.maintenanceService.findAllVendors(query, userRole, userOrgId, entityIds);
    }

    @Get('vendors/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.MAINTENANCE)
    @ApiOperation({ summary: 'Get vendor by ID' })
    @ApiResponse({ status: 200, description: 'Vendor retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    findOneVendor(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.maintenanceService.findOneVendor(id, userRole, userOrgId, entityIds);
    }

    @Patch('vendors/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.MAINTENANCE)
    @ApiOperation({ summary: 'Update vendor' })
    @ApiResponse({ status: 200, description: 'Vendor updated successfully' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    updateVendor(
        @Param('id') id: string,
        @Body() updateVendorDto: UpdateVendorDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.maintenanceService.updateVendor(id, updateVendorDto, userRole, userOrgId, entityIds);
    }

    @Delete('vendors/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Delete vendor' })
    @ApiResponse({ status: 200, description: 'Vendor deleted successfully' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    @ApiResponse({ status: 400, description: 'Cannot delete vendor with existing assignments' })
    deleteVendor(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.maintenanceService.deleteVendor(id, userRole, userOrgId, entityIds);
    }

    // ============= MAINTENANCE REPORTS =============

    @Get('reports/stats/:entityId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.MAINTENANCE)
    @ApiOperation({ summary: 'Get maintenance statistics for an entity' })
    @ApiResponse({ status: 200, description: 'Maintenance stats retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Entity not found' })
    getMaintenanceStats(
        @Param('entityId') entityId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.maintenanceService.getMaintenanceStats(entityId, userRole, userOrgId, entityIds, startDate, endDate);
    }
}