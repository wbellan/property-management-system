// src/financials/financials.controller.ts
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

import { FinancialsService } from './financials.service';
import { CreateBankLedgerDto } from './dto/create-bank-ledger.dto';
import { UpdateBankLedgerDto } from './dto/update-bank-ledger.dto';
import { CreateChartAccountDto } from './dto/create-chart-account.dto';
import { UpdateChartAccountDto } from './dto/update-chart-account.dto';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FinancialQueryDto, InvoiceQueryDto, PaymentQueryDto, LedgerQueryDto } from './dto/financial-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Financials')
@Controller('financials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FinancialsController {
    constructor(private readonly financialsService: FinancialsService) { }

    // ============= BANK LEDGERS =============

    @Post('bank-ledgers')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Create a new bank ledger' })
    @ApiResponse({ status: 201, description: 'Bank ledger created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    createBankLedger(
        @Body() createBankLedgerDto: CreateBankLedgerDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.financialsService.createBankLedger(createBankLedgerDto, userRole, userOrgId, entityIds);
    }

    @Get('bank-ledgers')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get all bank ledgers' })
    @ApiResponse({ status: 200, description: 'Bank ledgers retrieved successfully' })
    findAllBankLedgers(
        @Query() query: FinancialQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.financialsService.findAllBankLedgers(query, userRole, userOrgId, entityIds);
    }

    @Get('bank-ledgers/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get bank ledger by ID' })
    @ApiResponse({ status: 200, description: 'Bank ledger retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Bank ledger not found' })
    findOneBankLedger(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.financialsService.findOneBankLedger(id, userRole, userOrgId, entityIds);
    }

    @Patch('bank-ledgers/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Update bank ledger' })
    @ApiResponse({ status: 200, description: 'Bank ledger updated successfully' })
    @ApiResponse({ status: 404, description: 'Bank ledger not found' })
    updateBankLedger(
        @Param('id') id: string,
        @Body() updateBankLedgerDto: UpdateBankLedgerDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.financialsService.updateBankLedger(id, updateBankLedgerDto, userRole, userOrgId, entityIds);
    }

    // ============= CHART OF ACCOUNTS =============

    @Post('chart-accounts')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Create a new chart of account' })
    @ApiResponse({ status: 201, description: 'Chart account created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 400, description: 'Account code already exists' })
    createChartAccount(
        @Body() createChartAccountDto: CreateChartAccountDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.financialsService.createChartAccount(createChartAccountDto, userRole, userOrgId, entityIds);
    }

    @Get('chart-accounts')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get all chart of accounts' })
    @ApiResponse({ status: 200, description: 'Chart accounts retrieved successfully' })
    findAllChartAccounts(
        @Query() query: FinancialQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.financialsService.findAllChartAccounts(query, userRole, userOrgId, entityIds);
    }

    // ============= LEDGER ENTRIES =============

    @Post('ledger-entries')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Create a new ledger entry' })
    @ApiResponse({ status: 201, description: 'Ledger entry created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 400, description: 'Bank ledger and chart account must belong to same entity' })
    createLedgerEntry(
        @Body() createLedgerEntryDto: CreateLedgerEntryDto,
        @CurrentUser('userId') userId: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.financialsService.createLedgerEntry(createLedgerEntryDto, userId, userRole, userOrgId, entityIds);
    }

    @Get('ledger-entries')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get all ledger entries' })
    @ApiResponse({ status: 200, description: 'Ledger entries retrieved successfully' })
    findAllLedgerEntries(
        @Query() query: LedgerQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.financialsService.findAllLedgerEntries(query, userRole, userOrgId, entityIds);
    }

    // ============= INVOICES =============

    @Post('invoices')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Create a new invoice' })
    @ApiResponse({ status: 201, description: 'Invoice created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 400, description: 'Invoice number already exists' })
    createInvoice(
        @Body() createInvoiceDto: CreateInvoiceDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.financialsService.createInvoice(createInvoiceDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get('invoices')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT, UserRole.TENANT)
    @ApiOperation({ summary: 'Get all invoices' })
    @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
    findAllInvoices(
        @Query() query: InvoiceQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.financialsService.findAllInvoices(query, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get('invoices/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT, UserRole.TENANT)
    @ApiOperation({ summary: 'Get invoice by ID' })
    @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    findOneInvoice(
        @Param('id') id: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.financialsService.findOneInvoice(id, userRole, userOrgId, entityIds, propertyIds);
    }

    @Patch('invoices/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Update invoice' })
    @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    @ApiResponse({ status: 400, description: 'Cannot update paid invoices' })
    updateInvoice(
        @Param('id') id: string,
        @Body() updateInvoiceDto: UpdateInvoiceDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.financialsService.updateInvoice(id, updateInvoiceDto, userRole, userOrgId, entityIds, propertyIds);
    }

    // ============= PAYMENTS =============

    @Post('payments')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT, UserRole.TENANT)
    @ApiOperation({ summary: 'Create a new payment' })
    @ApiResponse({ status: 201, description: 'Payment created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 400, description: 'Invoice already paid or payment exceeds balance' })
    createPayment(
        @Body() createPaymentDto: CreatePaymentDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.financialsService.createPayment(createPaymentDto, userRole, userOrgId, entityIds, propertyIds);
    }

    @Get('payments')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT, UserRole.TENANT)
    @ApiOperation({ summary: 'Get all payments' })
    @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
    findAllPayments(
        @Query() query: PaymentQueryDto,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
        @CurrentUser('properties') userProperties: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        const propertyIds = userProperties.map(p => p.id);
        return this.financialsService.findAllPayments(query, userRole, userOrgId, entityIds, propertyIds);
    }

    // ============= FINANCIAL REPORTS =============

    @Get('reports/summary/:entityId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get financial summary for an entity' })
    @ApiResponse({ status: 200, description: 'Financial summary retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Entity not found' })
    getFinancialSummary(
        @Param('entityId') entityId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.financialsService.getFinancialSummary(entityId, userRole, userOrgId, entityIds, startDate, endDate);
    }

    @Get('reports/rent-roll/:entityId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get rent roll report for an entity' })
    @ApiResponse({ status: 200, description: 'Rent roll retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Entity not found' })
    getRentRoll(
        @Param('entityId') entityId: string,
        @CurrentUser('role') userRole: UserRole,
        @CurrentUser('organizationId') userOrgId: string,
        @CurrentUser('entities') userEntities: any[],
    ) {
        const entityIds = userEntities.map(e => e.id);
        return this.financialsService.getRentRoll(entityId, userRole, userOrgId, entityIds);
    }
}