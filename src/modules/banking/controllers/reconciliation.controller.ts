import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { ReconciliationService } from '../services/reconciliation.service';
import {
    ImportBankStatementDto,
    CreateReconciliationDto,
    CreateAdjustmentEntryDto
} from '../dto/reconciliation.dto';

@ApiTags('Bank Reconciliation')
@Controller('entities/:entityId/reconciliation')
export class ReconciliationController {
    constructor(private readonly reconciliationService: ReconciliationService) { }

    @Post('import-statement')
    @ApiOperation({ summary: 'Import bank statement for reconciliation' })
    @ApiResponse({
        status: 201,
        description: 'Bank statement imported successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid statement data or duplicate statement',
    })
    async importStatement(
        @Param('entityId') entityId: string,
        @Body() importStatementDto: ImportBankStatementDto,
        @Request() req: any,
    ) {
        return this.reconciliationService.importBankStatement(
            entityId,
            importStatementDto,
            req.user?.id || 'system'
        );
    }

    @Post('upload-statement/:bankAccountId')
    @ApiOperation({ summary: 'Upload and parse bank statement file (CSV, OFX, QIF)' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    @ApiResponse({
        status: 201,
        description: 'Bank statement file uploaded and parsed successfully',
    })
    async uploadStatementFile(
        @Param('entityId') entityId: string,
        @Param('bankAccountId') bankAccountId: string,
        @UploadedFile() file: Express.Multer.File,
        @Request() req: any,
    ) {
        // This would parse CSV/OFX/QIF files and convert to ImportBankStatementDto
        // Implementation would depend on file format
        throw new Error('File upload parsing not yet implemented');
    }

    @Get('unreconciled/:bankAccountId')
    @ApiOperation({ summary: 'Get unreconciled transactions for a bank account' })
    @ApiResponse({
        status: 200,
        description: 'Unreconciled transactions retrieved successfully',
    })
    async getUnreconciledTransactions(
        @Param('entityId') entityId: string,
        @Param('bankAccountId') bankAccountId: string,
    ) {
        return this.reconciliationService.getUnreconciledTransactions(entityId, bankAccountId);
    }

    @Get('suggest-matches/:bankAccountId')
    @ApiOperation({ summary: 'Get suggested matches between ledger entries and bank transactions' })
    @ApiResponse({
        status: 200,
        description: 'Match suggestions retrieved successfully',
    })
    async suggestMatches(
        @Param('entityId') entityId: string,
        @Param('bankAccountId') bankAccountId: string,
    ) {
        return this.reconciliationService.suggestMatches(entityId, bankAccountId);
    }

    @Post('create')
    @ApiOperation({ summary: 'Create a reconciliation with matched transactions' })
    @ApiResponse({
        status: 201,
        description: 'Reconciliation created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid reconciliation data',
    })
    async createReconciliation(
        @Param('entityId') entityId: string,
        @Body() createReconciliationDto: CreateReconciliationDto,
        @Request() req: any,
    ) {
        return this.reconciliationService.createReconciliation(
            entityId,
            createReconciliationDto,
            req.user?.id || 'system'
        );
    }

    @Post('adjustment')
    @ApiOperation({ summary: 'Create an adjustment entry for reconciliation differences' })
    @ApiResponse({
        status: 201,
        description: 'Adjustment entry created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid adjustment data',
    })
    async createAdjustment(
        @Param('entityId') entityId: string,
        @Body() createAdjustmentDto: CreateAdjustmentEntryDto,
        @Request() req: any,
    ) {
        return this.reconciliationService.createAdjustmentEntry(
            entityId,
            createAdjustmentDto,
            req.user?.id || 'system'
        );
    }

    @Get('summary/:bankAccountId')
    @ApiOperation({ summary: 'Get reconciliation summary for a bank account' })
    @ApiQuery({ name: 'statementId', required: false, description: 'Specific statement ID' })
    @ApiResponse({
        status: 200,
        description: 'Reconciliation summary retrieved successfully',
    })
    async getReconciliationSummary(
        @Param('entityId') entityId: string,
        @Param('bankAccountId') bankAccountId: string,
        @Query('statementId') statementId?: string,
    ) {
        return this.reconciliationService.getReconciliationSummary(entityId, bankAccountId, statementId);
    }

    @Get('history/:bankAccountId')
    @ApiOperation({ summary: 'Get reconciliation history for a bank account' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of reconciliations to return' })
    @ApiQuery({ name: 'offset', required: false, description: 'Number of reconciliations to skip' })
    @ApiResponse({
        status: 200,
        description: 'Reconciliation history retrieved successfully',
    })
    async getReconciliationHistory(
        @Param('entityId') entityId: string,
        @Param('bankAccountId') bankAccountId: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        // Implementation would fetch historical reconciliations
        return { message: 'Reconciliation history endpoint - implementation pending' };
    }
}