import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditService } from '../services/audit.service';

@ApiTags('Audit & Compliance')
@Controller('entities/:entityId/audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get('trail')
    @ApiOperation({ summary: 'Get audit trail for entity' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of entries to return' })
    @ApiQuery({ name: 'offset', required: false, description: 'Number of entries to skip' })
    @ApiResponse({
        status: 200,
        description: 'Audit trail retrieved successfully',
    })
    async getAuditTrail(
        @Param('entityId') entityId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.auditService.getAuditTrail(
            entityId,
            startDate,
            endDate,
            limit ? parseInt(limit) : 100,
            offset ? parseInt(offset) : 0,
        );
    }

    @Get('compliance-report')
    @ApiOperation({ summary: 'Generate compliance report for entity' })
    @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
    @ApiResponse({
        status: 200,
        description: 'Compliance report generated successfully',
    })
    async getComplianceReport(
        @Param('entityId') entityId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.auditService.generateComplianceReport(entityId, startDate, endDate);
    }

    @Get('activity-summary')
    @ApiOperation({ summary: 'Get banking activity summary for entity' })
    @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back' })
    @ApiResponse({
        status: 200,
        description: 'Activity summary retrieved successfully',
    })
    async getActivitySummary(
        @Param('entityId') entityId: string,
        @Query('days') days?: string,
    ) {
        return this.auditService.getBankingActivitySummary(
            entityId,
            days ? parseInt(days) : 30,
        );
    }

    @Get('export')
    @ApiOperation({ summary: 'Export audit trail data' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'format', required: false, enum: ['JSON', 'CSV'], description: 'Export format' })
    @ApiResponse({
        status: 200,
        description: 'Audit data exported successfully',
    })
    async exportAuditTrail(
        @Param('entityId') entityId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('format') format?: 'JSON' | 'CSV',
    ) {
        return this.auditService.exportAuditTrail(
            entityId,
            startDate,
            endDate,
            format || 'JSON',
        );
    }
}