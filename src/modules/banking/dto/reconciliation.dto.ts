// src/modules/banking/dto/reconciliation.dto.ts
import { IsString, IsOptional, IsEnum, IsNotEmpty, IsNumberString, IsDateString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BankStatementEntryDto {
    @ApiProperty({ description: 'Transaction date from bank statement' })
    @IsDateString()
    transactionDate: string;

    @ApiProperty({ description: 'Transaction amount (positive for deposits, negative for withdrawals)' })
    @IsNumberString()
    amount: string;

    @ApiProperty({ description: 'Transaction description from bank' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiPropertyOptional({ description: 'Check number or reference from bank' })
    @IsString()
    @IsOptional()
    referenceNumber?: string;

    @ApiPropertyOptional({ description: 'Transaction type from bank (DEBIT/CREDIT)' })
    @IsString()
    @IsOptional()
    transactionType?: string;

    @ApiPropertyOptional({ description: 'Running balance from bank statement' })
    @IsNumberString()
    @IsOptional()
    runningBalance?: string;
}

export class ImportBankStatementDto {
    @ApiProperty({ description: 'Bank account ID for this statement' })
    @IsString()
    @IsNotEmpty()
    bankAccountId: string;

    @ApiProperty({ description: 'Statement period start date' })
    @IsDateString()
    statementStartDate: string;

    @ApiProperty({ description: 'Statement period end date' })
    @IsDateString()
    statementEndDate: string;

    @ApiProperty({ description: 'Opening balance from statement' })
    @IsNumberString()
    openingBalance: string;

    @ApiProperty({ description: 'Closing balance from statement' })
    @IsNumberString()
    closingBalance: string;

    @ApiProperty({ type: [BankStatementEntryDto], description: 'Array of transactions from statement' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BankStatementEntryDto)
    transactions: BankStatementEntryDto[];

    @ApiPropertyOptional({ description: 'Statement file name or identifier' })
    @IsString()
    @IsOptional()
    statementReference?: string;
}

export class ReconciliationMatchDto {
    @ApiProperty({ description: 'Ledger entry ID to match' })
    @IsString()
    @IsNotEmpty()
    ledgerEntryId: string;

    @ApiProperty({ description: 'Bank statement transaction ID to match with' })
    @IsString()
    @IsNotEmpty()
    bankTransactionId: string;

    @ApiPropertyOptional({ description: 'Notes about this match' })
    @IsString()
    @IsOptional()
    matchNotes?: string;
}

export class CreateReconciliationDto {
    @ApiProperty({ description: 'Bank account ID being reconciled' })
    @IsString()
    @IsNotEmpty()
    bankAccountId: string;

    @ApiProperty({ description: 'Bank statement ID for this reconciliation' })
    @IsString()
    @IsNotEmpty()
    bankStatementId: string;

    @ApiProperty({ description: 'Reconciliation period start date' })
    @IsDateString()
    reconciliationDate: string;

    @ApiProperty({ type: [ReconciliationMatchDto], description: 'Array of transaction matches' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReconciliationMatchDto)
    matches: ReconciliationMatchDto[];

    @ApiPropertyOptional({ description: 'Notes about this reconciliation' })
    @IsString()
    @IsOptional()
    notes?: string;
}

export class CreateAdjustmentEntryDto {
    @ApiProperty({ description: 'Bank account ID' })
    @IsString()
    @IsNotEmpty()
    bankAccountId: string;

    @ApiProperty({ description: 'Chart account ID for the adjustment' })
    @IsString()
    @IsNotEmpty()
    chartAccountId: string;

    @ApiProperty({ description: 'Adjustment amount' })
    @IsNumberString()
    amount: string;

    @ApiProperty({ description: 'Description of the adjustment' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: 'Adjustment date' })
    @IsDateString()
    adjustmentDate: string;

    @ApiProperty({
        enum: ['BANK_FEE', 'INTEREST', 'NSF_FEE', 'CORRECTION', 'OTHER'],
        description: 'Type of adjustment'
    })
    @IsString()
    adjustmentType: 'BANK_FEE' | 'INTEREST' | 'NSF_FEE' | 'CORRECTION' | 'OTHER';

    @ApiPropertyOptional({ description: 'Reference to reconciliation' })
    @IsString()
    @IsOptional()
    reconciliationId?: string;
}

export class ReconciliationSummaryDto {
    bankAccountId: string;
    statementPeriod: {
        startDate: string;
        endDate: string;
    };
    openingBalance: string;
    closingBalance: string;
    bookBalance: string;
    totalDeposits: string;
    totalWithdrawals: string;
    reconciledTransactions: number;
    unreconciledTransactions: number;
    adjustments: number;
    balanceDifference: string;
    isReconciled: boolean;
}