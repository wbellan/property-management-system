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
    HttpCode,
    HttpStatus,
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

    // Should be ablel to remove this.
    @Post()
    @ApiOperation({ summary: 'Create a single ledger entry (use /multiple instead)' })
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
        console.log('⚠️ Controller: Single entry creation (deprecated) for entityId:', entityId);

        // Convert single entry to multiple entry format for consistency
        const multipleDto: CreateMultipleLedgerEntriesDto = {
            entries: [{
                bankLedgerId: createLedgerEntryDto.bankLedgerId,
                chartAccountId: createLedgerEntryDto.chartAccountId,
                entryType: createLedgerEntryDto.entryType,
                description: createLedgerEntryDto.description,
                debitAmount: createLedgerEntryDto.debitAmount.toString(),
                creditAmount: createLedgerEntryDto.creditAmount.toString(),
                transactionDate: createLedgerEntryDto.transactionDate,
                referenceId: createLedgerEntryDto.referenceId,
                referenceNumber: createLedgerEntryDto.referenceNumber,
            }],
            transactionDescription: createLedgerEntryDto.description
        };

        const result = await this.ledgerEntriesService.createMultipleEntries(
            entityId,
            multipleDto,
            req.user?.userId || 'system'
        );

        return result[0]; // Return just the first entry for backward compatibility
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
    @ApiResponse({
        status: 404,
        description: 'Bank ledger or chart account not found for entity',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async createMultiple(
        @Param('entityId') entityId: string,
        @Body() createMultipleDto: CreateMultipleLedgerEntriesDto,
        @Request() req: any,
    ) {
        console.log('🏦 Controller: Creating multiple entries for entityId:', entityId);
        console.log('👤 User:', req.user?.userId);
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
    @ApiResponse({
        status: 404,
        description: 'Bank account or chart account not found for entity',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async createSimple(
        @Param('entityId') entityId: string,
        @Body() createSimpleDto: CreateSimpleEntryDto,
        @Request() req: any,
    ) {
        console.log('📝 Controller: Creating simple entry for entityId:', entityId);
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
    @ApiResponse({
        status: 404,
        description: 'Bank account or income account not found for entity',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async recordPayment(
        @Param('entityId') entityId: string,
        @Body() recordPaymentDto: RecordPaymentDto,
        @Request() req: any,
    ) {
        console.log('💳 Controller: Recording payment for entityId:', entityId);
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
    @ApiResponse({
        status: 404,
        description: 'Bank account or income accounts not found for entity',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async recordCheckDeposit(
        @Param('entityId') entityId: string,
        @Body() recordCheckDepositDto: RecordCheckDepositDto,
        @Request() req: any,
    ) {
        console.log('🏦 Controller: Recording check deposit for entityId:', entityId);
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
        console.log('📊 Controller: Getting ledger entries for entityId:', entityId);
        return this.ledgerEntriesService.getLedgerEntries(
            entityId,
            bankLedgerId,
            chartAccountId,
            limit ? parseInt(limit, 10) : 50,
            offset ? parseInt(offset, 10) : 0,
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

    // FIX: Add the missing DELETE endpoint for individual entries
    @Delete(':entryId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a specific ledger entry' })
    @ApiResponse({
        status: 204,
        description: 'Ledger entry deleted successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Ledger entry not found for entity',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async deleteEntry(
        @Param('entityId') entityId: string,
        @Param('entryId') entryId: string,
    ) {
        console.log(`🗑️ Controller: Deleting entry ${entryId} for entity ${entityId}`);
        await this.ledgerEntriesService.deleteEntry(entityId, entryId);
        return; // 204 No Content
    }

    // FIX: Add bulk delete endpoint for testing
    @Delete()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Delete all ledger entries for an entity',
        description: '⚠️ WARNING: This will delete ALL ledger entries for the entity. Use for testing only.'
    })
    @ApiResponse({
        status: 204,
        description: 'All ledger entries deleted successfully',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async deleteAllEntries(
        @Param('entityId') entityId: string,
    ) {
        console.log(`🗑️ Controller: BULK DELETE all entries for entity ${entityId}`);
        await this.ledgerEntriesService.deleteAllEntries(entityId);
        return; // 204 No Content
    }
}