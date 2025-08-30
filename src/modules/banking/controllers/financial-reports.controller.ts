import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FinancialReportsService } from '../services/financial-reports.service';
import { Decimal } from '@prisma/client/runtime/library';

@ApiTags('Financial Reports')
@Controller('entities/:entityId/reports')
export class FinancialReportsController {
    constructor(private readonly reportsService: FinancialReportsService) { }

    @Get('trial-balance')
    @ApiOperation({ summary: 'Generate trial balance report' })
    @ApiQuery({ name: 'asOfDate', required: false, description: 'As of date (YYYY-MM-DD)' })
    @ApiResponse({
        status: 200,
        description: 'Trial balance generated successfully',
    })
    async getTrialBalance(
        @Param('entityId') entityId: string,
        @Query('asOfDate') asOfDate?: string,
    ) {
        return this.reportsService.getTrialBalance(entityId, asOfDate);
    }

    @Get('income-statement')
    @ApiOperation({ summary: 'Generate income statement (profit & loss) report' })
    @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
    @ApiResponse({
        status: 200,
        description: 'Income statement generated successfully',
    })
    async getIncomeStatement(
        @Param('entityId') entityId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reportsService.getIncomeStatement(entityId, startDate, endDate);
    }

    @Get('balance-sheet')
    @ApiOperation({ summary: 'Generate balance sheet report' })
    @ApiQuery({ name: 'asOfDate', required: false, description: 'As of date (YYYY-MM-DD)' })
    @ApiResponse({
        status: 200,
        description: 'Balance sheet generated successfully',
    })
    async getBalanceSheet(
        @Param('entityId') entityId: string,
        @Query('asOfDate') asOfDate?: string,
    ) {
        return this.reportsService.getBalanceSheet(entityId, asOfDate);
    }

    @Get('cash-flow')
    @ApiOperation({ summary: 'Generate cash flow statement' })
    @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
    @ApiResponse({
        status: 200,
        description: 'Cash flow statement generated successfully',
    })
    async getCashFlowStatement(
        @Param('entityId') entityId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reportsService.getCashFlowStatement(entityId, startDate, endDate);
    }

    @Get('reconciliation/:bankAccountId')
    @ApiOperation({ summary: 'Generate bank reconciliation report' })
    @ApiQuery({ name: 'month', required: false, description: 'Month in YYYY-MM format' })
    @ApiResponse({
        status: 200,
        description: 'Bank reconciliation report generated successfully',
    })
    async getBankReconciliationReport(
        @Param('entityId') entityId: string,
        @Param('bankAccountId') bankAccountId: string,
        @Query('month') month?: string,
    ) {
        return this.reportsService.getBankReconciliationReport(entityId, bankAccountId, month);
    }

    @Get('entity-summary')
    @ApiOperation({ summary: 'Generate comprehensive entity summary report' })
    @ApiResponse({
        status: 200,
        description: 'Entity summary report generated successfully',
    })
    async getEntitySummary(@Param('entityId') entityId: string) {
        return this.reportsService.getEntitySummaryReport(entityId);
    }

    @Get('bank-activity/:bankAccountId')
    @ApiOperation({ summary: 'Generate bank account activity report' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of transactions to return' })
    @ApiResponse({
        status: 200,
        description: 'Bank activity report generated successfully',
    })
    async getBankActivity(
        @Param('entityId') entityId: string,
        @Param('bankAccountId') bankAccountId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
    ) {
        // Get ledger entries for the bank account
        const whereClause: any = {
            bankLedgerId: bankAccountId,
        };

        if (startDate || endDate) {
            whereClause.transactionDate = {};
            if (startDate) whereClause.transactionDate.gte = new Date(startDate);
            if (endDate) whereClause.transactionDate.lte = new Date(endDate);
        }

        const ledgerEntries = await this.reportsService['prisma'].ledgerEntry.findMany({
            where: whereClause,
            include: {
                chartAccount: {
                    select: {
                        accountCode: true,
                        accountName: true,
                        accountType: true,
                    },
                },
                bankLedger: {
                    select: {
                        accountName: true,
                        bankName: true,
                    },
                },
            },
            orderBy: {
                transactionDate: 'desc',
            },
            take: limit ? parseInt(limit) : undefined,
        });

        // Calculate running balance
        let runningBalance = new Decimal(0);
        const transactions = ledgerEntries.reverse().map(entry => {
            if (entry.transactionType === 'DEBIT') {
                runningBalance = runningBalance.plus(entry.amount);
            } else {
                runningBalance = runningBalance.minus(entry.amount);
            }

            return {
                id: entry.id,
                date: entry.transactionDate,
                description: entry.description,
                referenceNumber: entry.referenceNumber,
                chartAccount: entry.chartAccount,
                transactionType: entry.transactionType,
                amount: entry.amount.toString(),
                runningBalance: runningBalance.toString(),
            };
        });

        return {
            bankAccount: ledgerEntries[0]?.bankLedger || null,
            period: {
                startDate: startDate || null,
                endDate: endDate || null,
            },
            transactions: transactions.reverse(),
            summary: {
                totalTransactions: transactions.length,
                totalDebits: transactions
                    .filter(t => t.transactionType === 'DEBIT')
                    .reduce((sum, t) => sum.plus(new Decimal(t.amount)), new Decimal(0))
                    .toString(),
                totalCredits: transactions
                    .filter(t => t.transactionType === 'CREDIT')
                    .reduce((sum, t) => sum.plus(new Decimal(t.amount)), new Decimal(0))
                    .toString(),
                endingBalance: runningBalance.toString(),
            },
        };
    }
}