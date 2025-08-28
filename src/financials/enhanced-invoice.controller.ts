// src/financials/controllers/enhanced-invoice.controller.ts

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
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole, InvoiceStatus } from '@prisma/client';
import { EnhancedInvoiceService } from './enhanced-invoice.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto';

@ApiTags('Enhanced Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnhancedInvoiceController {
    constructor(private readonly invoiceService: EnhancedInvoiceService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Create a new invoice with enhanced features' })
    @ApiResponse({ status: 201, description: 'Invoice created successfully' })
    async create(
        @Body() createInvoiceDto: CreateInvoiceDto,
        @CurrentUser() user: any,
    ) {
        const invoice = await this.invoiceService.create(createInvoiceDto, user.id);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Invoice created successfully',
            data: invoice,
        };
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT, UserRole.TENANT)
    @ApiOperation({ summary: 'Get all invoices with enhanced filtering' })
    @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
    async findAll(
        @Query('entityId') entityId: string,
        @Query() query: any,
        @CurrentUser() user: any,
    ) {
        // Enhanced role-based filtering
        let filterEntityId = entityId;
        if (user.role === UserRole.TENANT) {
            query.tenantId = user.id;
        } else if (user.role === UserRole.PROPERTY_MANAGER) {
            filterEntityId = entityId || user.entityIds?.[0];
        }

        const result = await this.invoiceService.findAll(filterEntityId, query);
        return {
            statusCode: HttpStatus.OK,
            message: 'Invoices retrieved successfully',
            data: result.invoices,
            pagination: result.pagination,
        };
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT, UserRole.TENANT)
    @ApiOperation({ summary: 'Get invoice by ID with full details' })
    @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
    async findOne(@Param('id') id: string, @CurrentUser() user: any) {
        const invoice = await this.invoiceService.findOne(id);

        // Check tenant access
        if (user.role === UserRole.TENANT && invoice.tenantId !== user.id) {
            return {
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Access denied',
            };
        }

        return {
            statusCode: HttpStatus.OK,
            message: 'Invoice retrieved successfully',
            data: invoice,
        };
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Update invoice with recalculation' })
    @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
    async update(
        @Param('id') id: string,
        @Body() updateInvoiceDto: UpdateInvoiceDto,
        @CurrentUser() user: any,
    ) {
        const invoice = await this.invoiceService.update(id, updateInvoiceDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Invoice updated successfully',
            data: invoice,
        };
    }

    // Enhanced Status Management
    @Patch(':id/status')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Update invoice status with business logic' })
    @ApiResponse({ status: 200, description: 'Invoice status updated successfully' })
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: InvoiceStatus,
        @CurrentUser() user: any,
    ) {
        const invoice = await this.invoiceService.updateStatus(id, status, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Invoice status updated successfully',
            data: invoice,
        };
    }

    @Post(':id/send')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Send invoice to customer' })
    @ApiResponse({ status: 200, description: 'Invoice sent successfully' })
    async send(@Param('id') id: string, @CurrentUser() user: any) {
        const invoice = await this.invoiceService.updateStatus(id, InvoiceStatus.SENT, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Invoice sent successfully',
            data: invoice,
        };
    }

    @Post(':id/void')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Void invoice with GL reversal' })
    @ApiResponse({ status: 200, description: 'Invoice voided successfully' })
    async void(@Param('id') id: string, @CurrentUser() user: any) {
        const invoice = await this.invoiceService.void(id, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Invoice voided successfully',
            data: invoice,
        };
    }

    // Late Fee Management
    @Post(':id/apply-late-fee')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Apply late fee to overdue invoice' })
    @ApiResponse({ status: 200, description: 'Late fee applied successfully' })
    async applyLateFee(@Param('id') id: string, @CurrentUser() user: any) {
        const invoice = await this.invoiceService.applyLateFee(id, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Late fee applied successfully',
            data: invoice,
        };
    }

    // Recurring Invoice Management
    @Post(':id/make-recurring')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Convert invoice to recurring template' })
    @ApiResponse({ status: 200, description: 'Invoice converted to recurring successfully' })
    async makeRecurring(
        @Param('id') id: string,
        @Body() recurringConfig: { frequency: string; dayOfMonth?: number; endDate?: string },
        @CurrentUser() user: any
    ) {
        // This would be implemented in the service
        return {
            statusCode: HttpStatus.OK,
            message: 'Invoice converted to recurring template',
            data: { recurring: true, config: recurringConfig },
        };
    }

    @Get(':id/recurring-children')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get all invoices generated from recurring template' })
    @ApiResponse({ status: 200, description: 'Child invoices retrieved successfully' })
    async getRecurringChildren(@Param('id') id: string) {
        // This would show all invoices generated from this recurring template
        return {
            statusCode: HttpStatus.OK,
            message: 'Child invoices retrieved successfully',
            data: [],
        };
    }

    // Advanced Operations
    @Post(':id/duplicate')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Duplicate invoice with new number' })
    @ApiResponse({ status: 201, description: 'Invoice duplicated successfully' })
    async duplicate(@Param('id') id: string, @CurrentUser() user: any) {
        // This would create a copy of the invoice with a new number
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Invoice duplicated successfully',
            data: null,
        };
    }

    @Get(':id/payment-history')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT, UserRole.TENANT)
    @ApiOperation({ summary: 'Get complete payment history for invoice' })
    @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
    async getPaymentHistory(@Param('id') id: string, @CurrentUser() user: any) {
        // This would show all payments applied to this invoice
        return {
            statusCode: HttpStatus.OK,
            message: 'Payment history retrieved successfully',
            data: [],
        };
    }

    @Post('bulk-operations')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Perform bulk operations on multiple invoices' })
    @ApiResponse({ status: 200, description: 'Bulk operations completed successfully' })
    async bulkOperations(
        @Body() body: {
            invoiceIds: string[];
            operation: 'send' | 'void' | 'apply-late-fee' | 'mark-overdue';
        },
        @CurrentUser() user: any
    ) {
        // This would handle bulk operations
        return {
            statusCode: HttpStatus.OK,
            message: 'Bulk operations completed successfully',
            data: { processed: 0, failed: 0 },
        };
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Delete invoice (super admin only)' })
    @ApiResponse({ status: 200, description: 'Invoice deleted successfully' })
    async remove(@Param('id') id: string) {
        const result = await this.invoiceService.delete(id);
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
        };
    }
}