import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LedgerEntriesService } from '../services/ledger-entries.service';
import {
    CreateLedgerEntryDto,
    CreateMultipleLedgerEntriesDto,
    CreateSimpleEntryDto,
    RecordPaymentDto,
    RecordCheckDepositDto
} from '../dto/create-ledger-entry.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('Ledger Entries')
@Controller('entities/:entityId/ledger-entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LedgerEntriesController {
    constructor(private readonly ledgerEntriesService: LedgerEntriesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a single ledger entry' })
    @ApiResponse({
        status: 201,
        description: 'Ledger entry created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Validation failed or invalid entry',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async create(
        @Param('entityId') entityId: string,
        @Body() createLedgerEntryDto: CreateLedgerEntryDto,
        @Request() req: any,
    ) {
        return this.ledgerEntriesService.createEntry(
            entityId,
            createLedgerEntryDto,
            req.user?.id || 'system'
        );
    }

    @Post('multiple')
    @ApiOperation({ summary: 'Create multiple ledger entries (double-entry transaction)' })
    @ApiResponse({
        status: 201,
        description: 'Multiple ledger entries created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Double-entry validation failed - debits must equal credits',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async createMultiple(
        @Param('entityId') entityId: string,
        @Body() createMultipleDto: CreateMultipleLedgerEntriesDto,
        @Request() req: any,
    ) {
        return this.ledgerEntriesService.createMultipleEntries(
            entityId,
            createMultipleDto,
            req.user?.id || 'system'
        );
    }

    @Post('simple')
    @ApiOperation({ summary: 'Create a simple transaction (deposit, withdrawal, payment)' })
    @ApiResponse({
        status: 201,
        description: 'Simple transaction created with automatic double-entry',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid transaction type or validation failed',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async createSimple(
        @Param('entityId') entityId: string,
        @Body() createSimpleDto: CreateSimpleEntryDto,
        @Request() req: any,
    ) {
        return this.ledgerEntriesService.createSimpleEntry(
            entityId,
            createSimpleDto,
            req.user?.id || 'system'
        );
    }

    @Post('payments')
    @ApiOperation({ summary: 'Record a payment received (rent, fees, etc.)' })
    @ApiResponse({
        status: 201,
        description: 'Payment recorded successfully with automatic entries',
    })
    @ApiResponse({
        status: 400,
        description: 'Payment validation failed',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async recordPayment(
        @Param('entityId') entityId: string,
        @Body() recordPaymentDto: RecordPaymentDto,
        @Request() req: any,
    ) {
        return this.ledgerEntriesService.recordPayment(
            entityId,
            recordPaymentDto,
            req.user?.id || 'system'
        );
    }

    @Post('check-deposits')
    @ApiOperation({ summary: 'Record a check deposit with multiple checks' })
    @ApiResponse({
        status: 201,
        description: 'Check deposit recorded successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Check deposit validation failed',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async recordCheckDeposit(
        @Param('entityId') entityId: string,
        @Body() recordCheckDepositDto: RecordCheckDepositDto,
        @Request() req: any,
    ) {
        return this.ledgerEntriesService.recordCheckDeposit(
            entityId,
            recordCheckDepositDto,
            req.user?.id || 'system'
        );
    }

    @Get()
    @ApiOperation({ summary: 'Get ledger entries for an entity' })
    @ApiQuery({ name: 'bankLedgerId', required: false, description: 'Filter by bank account' })
    @ApiQuery({ name: 'chartAccountId', required: false, description: 'Filter by chart account' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of entries to return (default: 50)' })
    @ApiQuery({ name: 'offset', required: false, description: 'Number of entries to skip (default: 0)' })
    @ApiResponse({
        status: 200,
        description: 'Ledger entries retrieved successfully',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async findAll(
        @Param('entityId') entityId: string,
        @Query('bankLedgerId') bankLedgerId?: string,
        @Query('chartAccountId') chartAccountId?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.ledgerEntriesService.getLedgerEntries(
            entityId,
            bankLedgerId,
            chartAccountId,
            parseInt(limit) || 50,
            parseInt(offset) || 0
        );
    }

    @Post('validate')
    @ApiOperation({ summary: 'Validate double-entry bookkeeping for a set of entries' })
    @ApiResponse({
        status: 200,
        description: 'Validation results returned',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async validateDoubleEntry(
        @Param('entityId') entityId: string,
        @Body() entries: CreateLedgerEntryDto[],
    ) {
        return this.ledgerEntriesService.validateDoubleEntry(entries);
    }
}