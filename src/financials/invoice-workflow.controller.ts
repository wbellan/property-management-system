// ===== INVOICE WORKFLOW CONTROLLER =====
// src/financials/invoice-workflow.controller.ts

import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { InvoiceWorkflowService } from './invoice-workflow.service';

@ApiTags('Invoice Workflow')
@Controller('invoice-workflow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceWorkflowController {
    constructor(private readonly workflowService: InvoiceWorkflowService) { }

    // Manual trigger for overdue invoice processing
    @Post('process-overdue')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Manually process overdue invoices' })
    @ApiResponse({ status: 200, description: 'Overdue invoices processed successfully' })
    async processOverdueInvoices(@CurrentUser() user: any) {
        const result = await this.workflowService.processOverdueInvoices();
        return {
            statusCode: HttpStatus.OK,
            message: 'Overdue invoices processed successfully',
            data: result,
        };
    }

    // Manual trigger for recurring invoice generation
    @Post('generate-recurring')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Manually generate recurring invoices' })
    @ApiResponse({ status: 200, description: 'Recurring invoices generated successfully' })
    async generateRecurringInvoices(@CurrentUser() user: any) {
        const result = await this.workflowService.generateRecurringInvoices();
        return {
            statusCode: HttpStatus.OK,
            message: 'Recurring invoices generated successfully',
            data: result,
        };
    }

    // Get workflow statistics
    @Get('stats')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get invoice workflow statistics' })
    @ApiResponse({ status: 200, description: 'Workflow statistics retrieved successfully' })
    async getWorkflowStats(@Query('entityId') entityId?: string) {
        // This would be implemented in the workflow service
        const stats = {
            overdueInvoicesCount: 0,
            recurringInvoicesCount: 0,
            lateFeesAppliedToday: 0,
            nextProcessingTime: new Date(),
        };

        return {
            statusCode: HttpStatus.OK,
            message: 'Workflow statistics retrieved successfully',
            data: stats,
        };
    }

    // Bulk late fee application
    @Post('bulk-late-fees')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Apply late fees to multiple overdue invoices' })
    @ApiResponse({ status: 200, description: 'Late fees applied successfully' })
    async applyBulkLateFees(
        @Body() body: { entityId: string; invoiceIds?: string[] },
        @CurrentUser() user: any
    ) {
        // This would be implemented to apply late fees in bulk
        return {
            statusCode: HttpStatus.OK,
            message: 'Bulk late fees processing initiated',
            data: { processed: 0, failed: 0 },
        };
    }

    // Preview recurring invoice generation
    @Get('preview-recurring/:templateId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Preview next recurring invoice generation' })
    @ApiResponse({ status: 200, description: 'Recurring invoice preview generated' })
    async previewRecurringInvoice(@Param('templateId') templateId: string) {
        // This would show what the next recurring invoice would look like
        return {
            statusCode: HttpStatus.OK,
            message: 'Recurring invoice preview generated',
            data: { preview: null, nextDueDate: new Date() },
        };
    }
}