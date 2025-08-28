// ===== PAYMENT APPLICATION CONTROLLER =====
// src/financials/controllers/payment-application.controller.ts

import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PaymentApplicationService } from './payment-application.service';
import { CreatePaymentApplicationDto } from './dto';

@Controller('payment-applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentApplicationController {
    constructor(private readonly paymentApplicationService: PaymentApplicationService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    async create(
        @Body() createApplicationDto: CreatePaymentApplicationDto,
        @CurrentUser() user: any,
    ) {
        const application = await this.paymentApplicationService.createApplication(
            createApplicationDto,
            user.id
        );
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Payment applied to invoice successfully',
            data: application,
        };
    }

    @Get('payment/:paymentId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    async getApplicationsByPayment(@Param('paymentId') paymentId: string) {
        const applications = await this.paymentApplicationService.findApplicationsByPayment(paymentId);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payment applications retrieved successfully',
            data: applications,
        };
    }

    @Get('invoice/:invoiceId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    async getApplicationsByInvoice(@Param('invoiceId') invoiceId: string) {
        const applications = await this.paymentApplicationService.findApplicationsByInvoice(invoiceId);
        return {
            statusCode: HttpStatus.OK,
            message: 'Invoice applications retrieved successfully',
            data: applications,
        };
    }

    @Get('unapplied-payments')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    async getUnappliedPayments(@Query('entityId') entityId: string) {
        const payments = await this.paymentApplicationService.getUnappliedPayments(entityId);
        return {
            statusCode: HttpStatus.OK,
            message: 'Unapplied payments retrieved successfully',
            data: payments,
        };
    }

    @Get('outstanding-invoices')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    async getOutstandingInvoices(@Query('entityId') entityId: string) {
        const invoices = await this.paymentApplicationService.getOutstandingInvoices(entityId);
        return {
            statusCode: HttpStatus.OK,
            message: 'Outstanding invoices retrieved successfully',
            data: invoices,
        };
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
    async remove(@Param('id') id: string, @CurrentUser() user: any) {
        const result = await this.paymentApplicationService.removeApplication(id, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
        };
    }
}
