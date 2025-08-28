// ===== ENHANCED INVOICE CONTROLLER =====
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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole, InvoiceStatus } from '@prisma/client';
import { EnhancedInvoiceService } from './enhanced-invoice.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnhancedInvoiceController {
    constructor(private readonly invoiceService: EnhancedInvoiceService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
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
    async findAll(
        @Query('entityId') entityId: string,
        @Query() query: any,
        @CurrentUser() user: any,
    ) {
        // Filter based on user role
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

    @Patch(':id/status')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
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
    async void(@Param('id') id: string, @CurrentUser() user: any) {
        const invoice = await this.invoiceService.void(id, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Invoice voided successfully',
            data: invoice,
        };
    }

    @Post(':id/apply-late-fee')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    async applyLateFee(@Param('id') id: string, @CurrentUser() user: any) {
        const invoice = await this.invoiceService.applyLateFee(id, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Late fee applied successfully',
            data: invoice,
        };
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN)
    async remove(@Param('id') id: string) {
        const result = await this.invoiceService.delete(id);
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
        };
    }
}