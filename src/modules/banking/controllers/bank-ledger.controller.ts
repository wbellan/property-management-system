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
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BankLedgerService } from '../services/bank-ledger.service';
import { CreateBankLedgerDto, UpdateBankLedgerDto } from '../dto/create-bank-ledger.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Bank Ledgers')
@Controller('entities/:entityId/bank-accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class BankLedgerController {
    constructor(private readonly bankLedgerService: BankLedgerService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new bank account for an entity' })
    @ApiResponse({
        status: 201,
        description: 'Bank account created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed or duplicate account',
    })
    @ApiResponse({
        status: 404,
        description: 'Entity not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async create(
        @Param('entityId') entityId: string,
        @Body() createBankLedgerDto: CreateBankLedgerDto,
        @Request() req: any,
    ) {
        return this.bankLedgerService.create(
            entityId,
            createBankLedgerDto,
            req.user?.id || 'system'
        );
    }

    @Get()
    @ApiOperation({ summary: 'Get all bank accounts for an entity' })
    @ApiResponse({
        status: 200,
        description: 'List of bank accounts retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Entity not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async findAll(
        @Param('entityId') entityId: string,
        @Query('includeInactive') includeInactive?: string,
    ) {
        const includeInactiveBool = includeInactive === 'true';
        return this.bankLedgerService.findAllByEntity(entityId, includeInactiveBool);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific bank account with recent transactions' })
    @ApiResponse({
        status: 200,
        description: 'Bank account details retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Bank account not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async findOne(
        @Param('entityId') entityId: string,
        @Param('id') id: string,
    ) {
        return this.bankLedgerService.findOne(entityId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a bank account' })
    @ApiResponse({
        status: 200,
        description: 'Bank account updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed or duplicate account',
    })
    @ApiResponse({
        status: 404,
        description: 'Bank account not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async update(
        @Param('entityId') entityId: string,
        @Param('id') id: string,
        @Body() updateBankLedgerDto: UpdateBankLedgerDto,
    ) {
        return this.bankLedgerService.update(entityId, id, updateBankLedgerDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deactivate a bank account' })
    @ApiResponse({
        status: 200,
        description: 'Bank account deactivated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Cannot deactivate account with unreconciled entries',
    })
    @ApiResponse({
        status: 404,
        description: 'Bank account not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async deactivate(
        @Param('entityId') entityId: string,
        @Param('id') id: string,
    ) {
        return this.bankLedgerService.deactivate(entityId, id);
    }

    @Get(':id/balance')
    @ApiOperation({ summary: 'Get current balance of a bank account' })
    @ApiResponse({
        status: 200,
        description: 'Current balance retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Bank account not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async getCurrentBalance(
        @Param('entityId') entityId: string,
        @Param('id') id: string,
    ) {
        const balance = await this.bankLedgerService.getCurrentBalance(entityId, id);
        return {
            bankAccountId: id,
            currentBalance: balance.toString(),
            currency: 'USD',
            asOfDate: new Date().toISOString(),
        };
    }

    @Post(':id/recalculate-balance')
    @ApiOperation({ summary: 'Recalculate balance from ledger entries (admin only)' })
    @ApiResponse({
        status: 200,
        description: 'Balance recalculated successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Bank account not found',
    })
    @Roles('ORG_ADMIN', 'SUPER_ADMIN')
    async recalculateBalance(
        @Param('entityId') entityId: string,
        @Param('id') id: string,
    ) {
        const newBalance = await this.bankLedgerService.recalculateBalance(entityId, id);
        return {
            bankAccountId: id,
            recalculatedBalance: newBalance.toString(),
            message: 'Balance recalculated from ledger entries',
            timestamp: new Date().toISOString(),
        };
    }

    // =====================================
    // NEW BANK TRANSACTION METHODS ADDED
    // =====================================

    @Get(':accountId/transactions')
    @ApiOperation({ summary: 'Get bank transactions for a specific account' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (ISO string)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (ISO string)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of transactions (default: 100)' })
    @ApiQuery({ name: 'offset', required: false, description: 'Number to skip (default: 0)' })
    @ApiResponse({
        status: 200,
        description: 'Bank transactions retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Bank account not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async getBankTransactions(
        @Param('entityId') entityId: string,
        @Param('accountId') accountId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const limitNum = parseInt(limit || '100');
        const offsetNum = parseInt(offset || '0');
        const parsedStartDate = startDate ? new Date(startDate) : undefined;
        const parsedEndDate = endDate ? new Date(endDate) : undefined;

        return this.bankLedgerService.getBankTransactions(
            entityId,
            accountId,
            {
                startDate: parsedStartDate,
                endDate: parsedEndDate,
                limit: limitNum,
                offset: offsetNum,
            }
        );
    }

    // @Post(':accountId/transactions')
    // @ApiOperation({ summary: 'Create a new bank transaction' })
    // @ApiResponse({
    //     status: 201,
    //     description: 'Bank transaction created successfully',
    // })
    // @ApiResponse({
    //     status: 400,
    //     description: 'Bad request - validation failed',
    // })
    // @ApiResponse({
    //     status: 404,
    //     description: 'Bank account not found',
    // })
    // @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    // async createBankTransaction(
    //     @Param('entityId') entityId: string,
    //     @Param('accountId') accountId: string,
    //     @Body() transactionData: {
    //         amount: number;
    //         description: string;
    //         transactionDate: string;
    //         transactionType: string;
    //         referenceNumber?: string;
    //     },
    //     @Request() req: any,
    // ) {
    //     return this.bankLedgerService.createBankTransaction(
    //         entityId,
    //         accountId,
    //         transactionData,
    //         req.user?.id || 'system'
    //     );
    // }

    // @Get(':accountId/transactions/:transactionId')
    // @ApiOperation({ summary: 'Get specific bank transaction details' })
    // @ApiResponse({
    //     status: 200,
    //     description: 'Transaction details retrieved successfully',
    // })
    // @ApiResponse({
    //     status: 404,
    //     description: 'Transaction not found',
    // })
    // @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    // async getBankTransaction(
    //     @Param('entityId') entityId: string,
    //     @Param('accountId') accountId: string,
    //     @Param('transactionId') transactionId: string,
    // ) {
    //     return this.bankLedgerService.getBankTransaction(
    //         entityId,
    //         accountId,
    //         transactionId
    //     );
    // }

    // @Patch(':accountId/transactions/:transactionId')
    // @ApiOperation({ summary: 'Update a bank transaction' })
    // @ApiResponse({
    //     status: 200,
    //     description: 'Transaction updated successfully',
    // })
    // @ApiResponse({
    //     status: 404,
    //     description: 'Transaction not found',
    // })
    // @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    // async updateBankTransaction(
    //     @Param('entityId') entityId: string,
    //     @Param('accountId') accountId: string,
    //     @Param('transactionId') transactionId: string,
    //     @Body() updateData: {
    //         description?: string;
    //         referenceNumber?: string;
    //     },
    //     @Request() req: any,
    // ) {
    //     return this.bankLedgerService.updateBankTransaction(
    //         entityId,
    //         accountId,
    //         transactionId,
    //         updateData,
    //         req.user?.id || 'system'
    //     );
    // }

    // @Delete(':accountId/transactions/:transactionId')
    // @ApiOperation({ summary: 'Delete a bank transaction' })
    // @ApiResponse({
    //     status: 200,
    //     description: 'Transaction deleted successfully',
    // })
    // @ApiResponse({
    //     status: 404,
    //     description: 'Transaction not found',
    // })
    // @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    // async deleteBankTransaction(
    //     @Param('entityId') entityId: string,
    //     @Param('accountId') accountId: string,
    //     @Param('transactionId') transactionId: string,
    //     @Request() req: any,
    // ) {
    //     return this.bankLedgerService.deleteBankTransaction(
    //         entityId,
    //         accountId,
    //         transactionId,
    //         req.user?.id || 'system'
    //     );
    // }
}