// src/modules/banking/controllers/payment-integration.controller.ts
import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PaymentIntegrationService } from '../services/payment-integration.service';
import {
    RecordPaymentDto,
    RecordCheckDepositDto,
    RecordPaymentBatchDto,
    GenerateReceiptDto
} from '../dto/payment-integration.dto';

@ApiTags('Payment Integration')
@Controller('entities/:entityId/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentIntegrationController {
    constructor(
        private readonly paymentIntegrationService: PaymentIntegrationService,
    ) { }

    @Post('record')
    @ApiOperation({ summary: 'Record a payment and create ledger entries' })
    @ApiResponse({
        status: 201,
        description: 'Payment recorded with automatic ledger entries created',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid payment data or bank account not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async recordPayment(
        @Param('entityId') entityId: string,
        @Body() recordPaymentDto: RecordPaymentDto,
        @Request() req: any,
    ) {
        return this.paymentIntegrationService.recordPayment(
            entityId,
            recordPaymentDto,
            req.user?.userId || 'system'
        );
    }

    @Post('checks')
    @ApiOperation({ summary: 'Record a check deposit with multiple checks' })
    @ApiResponse({
        status: 201,
        description: 'Check deposit recorded with ledger entries',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid check deposit data',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async recordCheckDeposit(
        @Param('entityId') entityId: string,
        @Body() recordCheckDepositDto: RecordCheckDepositDto,
        @Request() req: any,
    ) {
        return this.paymentIntegrationService.recordCheckDeposit(
            entityId,
            recordCheckDepositDto,
            req.user?.userId || 'system'
        );
    }

    @Post('batch')
    @ApiOperation({ summary: 'Record multiple payments as a batch deposit' })
    @ApiResponse({
        status: 201,
        description: 'Batch payment deposit recorded',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async recordPaymentBatch(
        @Param('entityId') entityId: string,
        @Body() recordBatchDto: RecordPaymentBatchDto,
        @Request() req: any,
    ) {
        return this.paymentIntegrationService.recordPaymentBatch(
            entityId,
            recordBatchDto,
            req.user?.userId || 'system'
        );
    }

    @Get('pending')
    @ApiOperation({ summary: 'Get unreconciled payments for an entity' })
    @ApiResponse({
        status: 200,
        description: 'Unreconciled payments retrieved successfully',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async getUnreconciledPayments(
        @Param('entityId') entityId: string,
        @Query('bankAccountId') bankAccountId?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Query('paymentMethod') paymentMethod?: string,
    ) {
        return this.paymentIntegrationService.getUnreconciledPayments(
            entityId,
            {
                bankAccountId,
                dateFrom,
                dateTo,
                paymentMethod,
            }
        );
    }

    @Post(':paymentId/reconcile')
    @ApiOperation({ summary: 'Mark a payment as reconciled with bank statement' })
    @ApiResponse({
        status: 200,
        description: 'Payment marked as reconciled',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async reconcilePayment(
        @Param('entityId') entityId: string,
        @Param('paymentId') paymentId: string,
        @Body() reconcileData: { reconciledAt: string; notes?: string },
        @Request() req: any,
    ) {
        return this.paymentIntegrationService.reconcilePayment(
            entityId,
            paymentId,
            reconcileData,
            req.user?.userId || 'system'
        );
    }

    @Post(':paymentId/receipt')
    @ApiOperation({ summary: 'Generate receipt for a payment' })
    @ApiResponse({
        status: 200,
        description: 'Receipt generated successfully',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async generateReceipt(
        @Param('entityId') entityId: string,
        @Param('paymentId') paymentId: string,
        @Body() receiptDto: GenerateReceiptDto,
        @Request() req: any,
    ) {
        return this.paymentIntegrationService.generateReceipt(
            entityId,
            paymentId,
            receiptDto,
            req.user?.userId || 'system'
        );
    }

    @Get('methods')
    @ApiOperation({ summary: 'Get available payment methods for entity' })
    @ApiResponse({
        status: 200,
        description: 'Payment methods retrieved successfully',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async getPaymentMethods(
        @Param('entityId') entityId: string,
    ) {
        return this.paymentIntegrationService.getPaymentMethods(entityId);
    }

    @Get('revenue-accounts')
    @ApiOperation({ summary: 'Get revenue accounts for payment categorization' })
    @ApiResponse({
        status: 200,
        description: 'Revenue accounts retrieved successfully',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async getRevenueAccounts(
        @Param('entityId') entityId: string,
    ) {
        return this.paymentIntegrationService.getRevenueAccounts(entityId);
    }
}