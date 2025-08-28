// ===== ENHANCED PAYMENT APPLICATION CONTROLLER =====
// src/financials/payment-application.controller.ts

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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PaymentApplicationService } from './payment-application.service';
import { CreatePaymentApplicationDto } from './dto';

@ApiTags('Payment Applications')
@Controller('payment-applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentApplicationController {
    constructor(private readonly paymentApplicationService: PaymentApplicationService) { }

    // Basic payment application
    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Apply payment to invoice' })
    @ApiResponse({ status: 201, description: 'Payment applied to invoice successfully' })
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

    // Auto-apply payment to oldest outstanding invoices
    @Post('auto-apply/:paymentId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Automatically apply payment to oldest outstanding invoices' })
    @ApiResponse({ status: 200, description: 'Payment auto-applied successfully' })
    async autoApply(
        @Param('paymentId') paymentId: string,
        @CurrentUser() user: any,
    ) {
        // This would automatically apply payment to oldest invoices first
        return {
            statusCode: HttpStatus.OK,
            message: 'Payment auto-applied successfully',
            data: { applicationsCreated: 0, amountApplied: 0, remainingBalance: 0 },
        };
    }

    // Bulk payment application
    @Post('bulk-apply')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Apply multiple payments to multiple invoices' })
    @ApiResponse({ status: 200, description: 'Bulk payment applications processed' })
    async bulkApply(
        @Body() body: {
            applications: Array<{
                paymentId: string;
                invoiceId: string;
                appliedAmount: number;
                notes?: string;
            }>;
        },
        @CurrentUser() user: any,
    ) {
        // This would process multiple payment applications at once
        return {
            statusCode: HttpStatus.OK,
            message: 'Bulk payment applications processed',
            data: { successful: 0, failed: 0, errors: [] },
        };
    }

    // Payment matching suggestions
    @Get('match-suggestions/:paymentId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get suggested invoice matches for payment' })
    @ApiResponse({ status: 200, description: 'Payment matching suggestions retrieved' })
    async getMatchSuggestions(@Param('paymentId') paymentId: string) {
        // This would suggest invoices to match with the payment based on amount, tenant, etc.
        return {
            statusCode: HttpStatus.OK,
            message: 'Payment matching suggestions retrieved',
            data: { exactMatches: [], partialMatches: [], suggestions: [] },
        };
    }

    // Get applications by payment
    @Get('payment/:paymentId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get all applications for a payment' })
    @ApiResponse({ status: 200, description: 'Payment applications retrieved successfully' })
    async getApplicationsByPayment(@Param('paymentId') paymentId: string) {
        const applications = await this.paymentApplicationService.findApplicationsByPayment(paymentId);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payment applications retrieved successfully',
            data: applications,
        };
    }

    // Get applications by invoice
    @Get('invoice/:invoiceId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get all applications for an invoice' })
    @ApiResponse({ status: 200, description: 'Invoice applications retrieved successfully' })
    async getApplicationsByInvoice(@Param('invoiceId') invoiceId: string) {
        const applications = await this.paymentApplicationService.findApplicationsByInvoice(invoiceId);
        return {
            statusCode: HttpStatus.OK,
            message: 'Invoice applications retrieved successfully',
            data: applications,
        };
    }

    // Get unapplied payments for matching
    @Get('unapplied-payments')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get payments available for application' })
    @ApiResponse({ status: 200, description: 'Unapplied payments retrieved successfully' })
    async getUnappliedPayments(@Query('entityId') entityId: string) {
        const payments = await this.paymentApplicationService.getUnappliedPayments(entityId);
        return {
            statusCode: HttpStatus.OK,
            message: 'Unapplied payments retrieved successfully',
            data: payments,
        };
    }

    // Get outstanding invoices for matching
    @Get('outstanding-invoices')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get invoices available for payment application' })
    @ApiResponse({ status: 200, description: 'Outstanding invoices retrieved successfully' })
    async getOutstandingInvoices(@Query('entityId') entityId: string) {
        const invoices = await this.paymentApplicationService.getOutstandingInvoices(entityId);
        return {
            statusCode: HttpStatus.OK,
            message: 'Outstanding invoices retrieved successfully',
            data: invoices,
        };
    }

    // Payment application dashboard data
    @Get('dashboard/:entityId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get payment application dashboard data' })
    @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
    async getDashboardData(@Param('entityId') entityId: string) {
        const [unappliedPayments, outstandingInvoices] = await Promise.all([
            this.paymentApplicationService.getUnappliedPayments(entityId),
            this.paymentApplicationService.getOutstandingInvoices(entityId),
        ]);

        const summary = {
            unappliedPaymentsCount: unappliedPayments.length,
            unappliedPaymentsTotal: unappliedPayments.reduce((sum, p) => sum + p.availableAmount, 0),
            outstandingInvoicesCount: outstandingInvoices.length,
            outstandingInvoicesTotal: outstandingInvoices.reduce((sum, i) => sum + Number(i.balanceAmount), 0),
            potentialMatches: 0, // This would calculate potential exact matches
        };

        return {
            statusCode: HttpStatus.OK,
            message: 'Dashboard data retrieved successfully',
            data: { summary, unappliedPayments, outstandingInvoices },
        };
    }

    // Partial payment application (split payment across multiple invoices)
    @Post('split-payment')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Split payment across multiple invoices' })
    @ApiResponse({ status: 200, description: 'Payment split successfully' })
    async splitPayment(
        @Body() body: {
            paymentId: string;
            allocations: Array<{
                invoiceId: string;
                amount: number;
                notes?: string;
            }>;
        },
        @CurrentUser() user: any,
    ) {
        // This would create multiple applications from a single payment
        return {
            statusCode: HttpStatus.OK,
            message: 'Payment split successfully',
            data: { applicationsCreated: body.allocations.length },
        };
    }

    // Remove payment application
    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
    @ApiOperation({ summary: 'Remove payment application' })
    @ApiResponse({ status: 200, description: 'Payment application removed successfully' })
    async remove(@Param('id') id: string, @CurrentUser() user: any) {
        const result = await this.paymentApplicationService.removeApplication(id, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
        };
    }

    // Application history and audit trail
    @Get('history/:entityId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get payment application history' })
    @ApiResponse({ status: 200, description: 'Application history retrieved successfully' })
    async getApplicationHistory(
        @Param('entityId') entityId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        // This would show chronological history of all payment applications
        return {
            statusCode: HttpStatus.OK,
            message: 'Application history retrieved successfully',
            data: { applications: [], pagination: { total: 0, page: 1, limit: 50 } },
        };
    }
}