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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChartAccountsService } from '../services/chart-accounts.service';
import { CreateChartAccountDto, UpdateChartAccountDto } from '../dto/create-chart-account.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AccountType } from '@prisma/client';

@ApiTags('Chart of Accounts')
@Controller('entities/:entityId/chart-accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChartAccountsController {
    constructor(private readonly chartAccountsService: ChartAccountsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new chart of accounts entry' })
    @ApiResponse({
        status: 201,
        description: 'Chart account created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed or duplicate account code',
    })
    @ApiResponse({
        status: 404,
        description: 'Entity or parent account not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async create(
        @Param('entityId') entityId: string,
        @Body() createChartAccountDto: CreateChartAccountDto,
    ) {
        return this.chartAccountsService.create(entityId, createChartAccountDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get chart of accounts for an entity (hierarchical structure)' })
    @ApiQuery({
        name: 'includeInactive',
        required: false,
        type: 'boolean',
        description: 'Include inactive accounts in the response'
    })
    @ApiResponse({
        status: 200,
        description: 'Chart of accounts retrieved successfully',
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
        return this.chartAccountsService.findAllByEntity(entityId, includeInactiveBool);
    }

    @Get('by-type/:accountType')
    @ApiOperation({ summary: 'Get accounts filtered by account type' })
    @ApiResponse({
        status: 200,
        description: 'Accounts by type retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Entity not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async getAccountsByType(
        @Param('entityId') entityId: string,
        @Param('accountType') accountType: AccountType,
    ) {
        return this.chartAccountsService.getAccountsByType(entityId, accountType);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific chart account with recent transactions' })
    @ApiResponse({
        status: 200,
        description: 'Chart account details retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Chart account not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')
    async findOne(
        @Param('entityId') entityId: string,
        @Param('id') id: string,
    ) {
        return this.chartAccountsService.findOne(entityId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a chart account' })
    @ApiResponse({
        status: 200,
        description: 'Chart account updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed',
    })
    @ApiResponse({
        status: 404,
        description: 'Chart account not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async update(
        @Param('entityId') entityId: string,
        @Param('id') id: string,
        @Body() updateChartAccountDto: UpdateChartAccountDto,
    ) {
        return this.chartAccountsService.update(entityId, id, updateChartAccountDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deactivate a chart account' })
    @ApiResponse({
        status: 200,
        description: 'Chart account deactivated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Cannot deactivate account with active child accounts',
    })
    @ApiResponse({
        status: 404,
        description: 'Chart account not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async deactivate(
        @Param('entityId') entityId: string,
        @Param('id') id: string,
    ) {
        return this.chartAccountsService.deactivate(entityId, id);
    }

    @Post('setup-default')
    @ApiOperation({ summary: 'Create default chart of accounts for an entity' })
    @ApiResponse({
        status: 201,
        description: 'Default chart of accounts created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Entity already has chart of accounts or validation failed',
    })
    @ApiResponse({
        status: 404,
        description: 'Entity not found',
    })
    @Roles('ENTITY_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')
    async setupDefaultChart(@Param('entityId') entityId: string) {
        // Check if entity already has chart accounts
        const existingAccounts = await this.chartAccountsService.findAllByEntity(entityId, true);

        if (existingAccounts.length > 0) {
            return {
                message: 'Entity already has chart of accounts',
                accountCount: existingAccounts.length,
            };
        }

        const defaultAccounts = await this.chartAccountsService.createDefaultChart(entityId);

        return {
            message: 'Default chart of accounts created successfully',
            accountsCreated: defaultAccounts.length,
            accounts: defaultAccounts,
        };
    }
}