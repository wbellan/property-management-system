import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    Delete,
    Patch,
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
            req.user?.userId || 'system'
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
        console.log('User trying to create ledger entries - req.user?.id', req.user?.id);
        console.log('User trying to create ledger entries req.user.userId ', req.user?.userId);
        return this.ledgerEntriesService.createMultipleEntries(
            entityId,
            createMultipleDto,
            req.user?.userId || 'system'
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
            req.user?.userId || 'system'
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
            req.user?.userId || 'system'
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
            req.user?.userId || 'system'
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

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific ledger entry' })
    @ApiResponse({
        status: 200,
        description: 'Ledger entry retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Ledger entry not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async findOne(
        @Param('entityId') entityId: string,
        @Param('id') id: string,
    ) {
        return this.ledgerEntriesService.findOne(entityId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a ledger entry' })
    @ApiResponse({
        status: 200,
        description: 'Ledger entry updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Update validation failed',
    })
    @ApiResponse({
        status: 404,
        description: 'Ledger entry not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async update(
        @Param('entityId') entityId: string,
        @Param('id') id: string,
        @Body() updateLedgerEntryDto: any, // Define proper DTO
        @Request() req: any,
    ) {
        return this.ledgerEntriesService.update(
            entityId,
            id,
            updateLedgerEntryDto,
            req.user?.userId || 'system'
        );
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a ledger entry' })
    @ApiResponse({
        status: 200,
        description: 'Ledger entry deleted successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Ledger entry not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async delete(
        @Param('entityId') entityId: string,
        @Param('id') id: string,
        @Request() req: any,
    ) {
        return this.ledgerEntriesService.delete(
            entityId,
            id,
            req.user?.userId || 'system'
        );
    }

    @Delete()
    @ApiOperation({ summary: 'Delete all ledger entries for an entity' })
    @ApiResponse({
        status: 200,
        description: 'All ledger entries deleted successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Cannot delete entries with unresolved references',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async deleteAll(
        @Param('entityId') entityId: string,
        @Request() req: any,
    ) {
        return this.ledgerEntriesService.deleteAll(
            entityId,
            req.user?.userId || 'system'
        );
    }
}