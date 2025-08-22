// src/reports/reports.controller.ts
import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  // ============= PROFIT & LOSS STATEMENTS =============

  @Get('profit-loss/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate Profit & Loss statement for an entity' })
  @ApiResponse({ status: 200, description: 'P&L statement generated successfully' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  @ApiQuery({ name: 'startDate', example: '2024-01-01', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', example: '2024-12-31', description: 'End date (YYYY-MM-DD)' })
  async getProfitLossStatement(
    @Param('entityId') entityId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.getProfitLossStatement(
      entityId,
      startDate,
      endDate,
      userRole,
      userOrgId,
      entityIds,
    );
  }

  // ============= OCCUPANCY ANALYTICS =============

  @Get('occupancy/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Generate occupancy analytics for an entity' })
  @ApiResponse({ status: 200, description: 'Occupancy analytics generated successfully' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async getOccupancyAnalytics(
    @Param('entityId') entityId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
  ) {
    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.getOccupancyAnalytics(
      entityId,
      userRole,
      userOrgId,
      entityIds,
    );
  }

  // ============= CASH FLOW ANALYSIS =============

  @Get('cash-flow/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate cash flow analysis for an entity' })
  @ApiResponse({ status: 200, description: 'Cash flow analysis generated successfully' })
  @ApiQuery({ name: 'startDate', example: '2024-01-01', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', example: '2024-12-31', description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'groupBy', enum: ['month', 'quarter', 'year'], example: 'month', description: 'Group results by period' })
  async getCashFlowAnalysis(
    @Param('entityId') entityId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
    @Query('groupBy') groupBy: 'month' | 'quarter' | 'year' = 'month',
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.getCashFlowAnalysis(
      entityId,
      startDate,
      endDate,
      groupBy,
      userRole,
      userOrgId,
      entityIds,
    );
  }

  // ============= RENT ROLL REPORTS =============

  @Get('rent-roll/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate detailed rent roll report' })
  @ApiResponse({ status: 200, description: 'Rent roll report generated successfully' })
  @ApiQuery({ name: 'propertyId', required: false, description: 'Filter by specific property' })
  @ApiQuery({ name: 'includeVacant', type: Boolean, example: false, description: 'Include vacant units' })
  async getRentRollReport(
    @Param('entityId') entityId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
    @Query('propertyId') propertyId?: string,
    @Query('includeVacant') includeVacant: boolean = false,
  ) {
    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.getEnhancedRentRollReport(
      entityId,
      userRole,
      userOrgId,
      entityIds,
      propertyId,
      includeVacant,
    );
  }

  // ============= LEASE EXPIRATION REPORTS =============

  @Get('lease-expiration/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER)
  @ApiOperation({ summary: 'Generate lease expiration report' })
  @ApiResponse({ status: 200, description: 'Lease expiration report generated successfully' })
  @ApiQuery({ name: 'months', type: Number, example: 6, description: 'Look ahead months' })
  @ApiQuery({ name: 'includeRenewalHistory', type: Boolean, example: false, description: 'Include renewal history' })
  async getLeaseExpirationReport(
    @Param('entityId') entityId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
    @Query('months') months: number = 6,
    @Query('includeRenewalHistory') includeRenewalHistory: boolean = false,
  ) {
    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.getEnhancedLeaseExpirationReport(
      entityId,
      months,
      includeRenewalHistory,
      userRole,
      userOrgId,
      entityIds,
    );
  }

  // ============= MAINTENANCE ANALYTICS =============

  @Get('maintenance-analytics/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.MAINTENANCE)
  @ApiOperation({ summary: 'Generate maintenance analytics and trends' })
  @ApiResponse({ status: 200, description: 'Maintenance analytics generated successfully' })
  @ApiQuery({ name: 'startDate', example: '2024-01-01', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', example: '2024-12-31', description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'propertyId', required: false, description: 'Filter by specific property' })
  async getMaintenanceAnalytics(
    @Param('entityId') entityId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
    @Query('propertyId') propertyId?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.getMaintenanceAnalytics(
      entityId,
      startDate,
      endDate,
      propertyId,
      userRole,
      userOrgId,
      entityIds,
    );
  }

  // ============= TENANT ANALYTICS =============

  @Get('tenant-analytics/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate tenant analytics including aging and payment history' })
  @ApiResponse({ status: 200, description: 'Tenant analytics generated successfully' })
  @ApiQuery({ name: 'includePaymentHistory', type: Boolean, example: false, description: 'Include detailed payment history' })
  async getTenantAnalytics(
    @Param('entityId') entityId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
    @Query('includePaymentHistory') includePaymentHistory: boolean = false,
  ) {
    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.getTenantAnalytics(
      entityId,
      includePaymentHistory,
      userRole,
      userOrgId,
      entityIds,
    );
  }

  // ============= PORTFOLIO OVERVIEW =============

  @Get('portfolio-overview/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
  @ApiOperation({ summary: 'Generate comprehensive portfolio overview' })
  @ApiResponse({ status: 200, description: 'Portfolio overview generated successfully' })
  @ApiQuery({ name: 'includeProjections', type: Boolean, example: false, description: 'Include financial projections' })
  async getPortfolioOverview(
    @Param('entityId') entityId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
    @Query('includeProjections') includeProjections: boolean = false,
  ) {
    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.getPortfolioOverview(
      entityId,
      includeProjections,
      userRole,
      userOrgId,
      entityIds,
    );
  }

  // ============= CUSTOM REPORTS =============

  @Post('custom')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate custom report based on parameters' })
  @ApiResponse({ status: 200, description: 'Custom report generated successfully' })
  async generateCustomReport(
    @Body() reportParams: {
      reportType: string;
      entityId: string;
      startDate?: string;
      endDate?: string;
      propertyIds?: string[];
      metrics?: string[];
      groupBy?: string;
      filters?: Record<string, any>;
    },
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
  ) {
    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.generateCustomReport(
      reportParams,
      userRole,
      userOrgId,
      entityIds,
    );
  }

  // ============= COMPARATIVE ANALYSIS =============

  @Get('comparative/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
  @ApiOperation({ summary: 'Generate comparative analysis between properties or time periods' })
  @ApiResponse({ status: 200, description: 'Comparative analysis generated successfully' })
  @ApiQuery({ name: 'compareType', enum: ['properties', 'periods'], example: 'properties', description: 'Type of comparison' })
  @ApiQuery({ name: 'startDate', example: '2024-01-01', description: 'Start date for comparison' })
  @ApiQuery({ name: 'endDate', example: '2024-12-31', description: 'End date for comparison' })
  @ApiQuery({ name: 'propertyIds', required: false, description: 'Comma-separated property IDs for comparison' })
  async getComparativeAnalysis(
    @Param('entityId') entityId: string,
    @Query('compareType') compareType: 'properties' | 'periods',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
    @Query('propertyIds') propertyIds?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const entityIds = userEntities.map(e => e.id);
    const propertyIdArray = propertyIds ? propertyIds.split(',') : undefined;

    return this.reportsService.getComparativeAnalysis(
      entityId,
      compareType,
      startDate,
      endDate,
      propertyIdArray,
      userRole,
      userOrgId,
      entityIds,
    );
  }

  // ============= EXPORT FUNCTIONALITY =============

  @Get('export/:reportType/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Export report data in various formats' })
  @ApiResponse({ status: 200, description: 'Report data exported successfully' })
  @ApiQuery({ name: 'format', enum: ['json', 'csv', 'xlsx'], example: 'json', description: 'Export format' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for time-based reports' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for time-based reports' })
  async exportReport(
    @Param('reportType') reportType: string,
    @Param('entityId') entityId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
    @Query('format') format: 'json' | 'csv' | 'xlsx' = 'json',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.exportReport(
      reportType,
      entityId,
      format,
      userRole,
      userOrgId,
      entityIds,
      startDate,
      endDate,
    );
  }

  // ============= SCHEDULED REPORTS =============

  @Post('schedule')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
  @ApiOperation({ summary: 'Schedule automatic report generation' })
  @ApiResponse({ status: 201, description: 'Report schedule created successfully' })
  async scheduleReport(
    @Body() scheduleParams: {
      reportType: string;
      entityId: string;
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
      recipients: string[];
      parameters?: Record<string, any>;
    },
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
  ) {
    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.scheduleReport(
      scheduleParams,
      userRole,
      userOrgId,
      entityIds,
    );
  }

  // ============= DASHBOARD METRICS =============

  // Add this new endpoint above the existing dashboard endpoint
  @Get('dashboard/organization/:organizationId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
  @ApiOperation({ summary: 'Get organization-wide dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Organization dashboard metrics retrieved successfully' })
  async getOrganizationDashboardMetrics(
    @Param('organizationId') organizationId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
  ) {
    console.log('getOrganizationDashboardMetrics called with:', {
      organizationId,
      userRole,
      userOrgId,
      userEntitiesCount: userEntities?.length
    });

    // Verify user can access this organization
    if (userRole !== UserRole.SUPER_ADMIN && organizationId !== userOrgId) {
      throw new ForbiddenException('Access denied to this organization');
    }

    const entityIds = userEntities?.map(e => e.id) || [];
    const result = await this.reportsService.getOrganizationDashboardMetrics(
      organizationId,
      userRole,
      userOrgId,
      entityIds,
    );

    return {
      success: true,
      data: result
    };
  }

  @Get('dashboard/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get dashboard metrics for quick overview' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  async getDashboardMetrics(
    @Param('entityId') entityId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('organizationId') userOrgId: string,
    @CurrentUser('entities') userEntities: any[],
  ) {
    console.log('getDashboardMetrics called with:', {
      entityId,
      userRole,
      userOrgId,
      userEntitiesCount: userEntities?.length
    });

    const entityIds = userEntities.map(e => e.id);
    return this.reportsService.getDashboardMetrics(
      entityId,
      userRole,
      userOrgId,
      entityIds,
    );
  }
}