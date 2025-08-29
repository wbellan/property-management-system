
// src/modules/banking/dto/create-ledger-entry.dto.ts
import { IsString, IsOptional, IsEnum, IsNotEmpty, IsNumberString, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EntryType } from '@prisma/client';

export class CreateLedgerEntryDto {
    @ApiProperty({ description: 'Bank ledger ID' })
    @IsString()
    @IsNotEmpty()
    bankLedgerId: string;

    @ApiProperty({ description: 'Chart account ID' })
    @IsString()
    @IsNotEmpty()
    chartAccountId: string;

    @ApiProperty({ enum: EntryType, description: 'Type of entry' })
    @IsEnum(EntryType)
    entryType: EntryType;

    @ApiProperty({ description: 'Transaction description' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: 'Debit amount (positive for debits)' })
    @IsNumberString()
    debitAmount: string;

    @ApiProperty({ description: 'Credit amount (positive for credits)' })
    @IsNumberString()
    creditAmount: string;

    @ApiProperty({ description: 'Transaction date (ISO string)' })
    @IsDateString()
    transactionDate: string;

    @ApiPropertyOptional({ description: 'Reference ID (invoice, payment, etc.)' })
    @IsString()
    @IsOptional()
    referenceId?: string;

    @ApiPropertyOptional({ description: 'Reference number (check number, etc.)' })
    @IsString()
    @IsOptional()
    referenceNumber?: string;
}

export class CreateMultipleLedgerEntriesDto {
    @ApiProperty({ type: [CreateLedgerEntryDto], description: 'Array of ledger entries' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLedgerEntryDto)
    entries: CreateLedgerEntryDto[];

    @ApiProperty({ description: 'Description for the entire transaction' })
    @IsString()
    @IsNotEmpty()
    transactionDescription: string;
}

// Simplified entry for common transactions
export class CreateSimpleEntryDto {
    @ApiProperty({ description: 'Bank account ID' })
    @IsString()
    @IsNotEmpty()
    bankAccountId: string;

    @ApiProperty({ description: 'Chart account ID' })
    @IsString()
    @IsNotEmpty()
    accountId: string;

    @ApiProperty({ description: 'Transaction amount (positive number)' })
    @IsNumberString()
    amount: string;

    @ApiProperty({ description: 'Transaction description' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: 'Transaction date' })
    @IsDateString()
    transactionDate: string;

    @ApiProperty({
        enum: ['DEPOSIT', 'WITHDRAWAL', 'PAYMENT', 'TRANSFER'],
        description: 'Simple transaction type'
    })
    @IsString()
    transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'TRANSFER';

    @ApiPropertyOptional({ description: 'Check number or reference' })
    @IsString()
    @IsOptional()
    referenceNumber?: string;
}

// Payment recording DTO
export class RecordPaymentDto {
    @ApiProperty({ description: 'Bank account to deposit into' })
    @IsString()
    @IsNotEmpty()
    bankAccountId: string;

    @ApiProperty({ description: 'Payment amount' })
    @IsNumberString()
    amount: string;

    @ApiProperty({ description: 'Payment description' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: 'Payment date' })
    @IsDateString()
    paymentDate: string;

    @ApiProperty({
        enum: ['CASH', 'CHECK', 'CREDIT_CARD', 'BANK_TRANSFER', 'ONLINE'],
        description: 'Payment method'
    })
    @IsString()
    paymentMethod: 'CASH' | 'CHECK' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'ONLINE';

    @ApiPropertyOptional({ description: 'Check number if payment by check' })
    @IsString()
    @IsOptional()
    checkNumber?: string;

    @ApiPropertyOptional({ description: 'Payer name' })
    @IsString()
    @IsOptional()
    payerName?: string;

    @ApiPropertyOptional({ description: 'Related invoice or lease ID' })
    @IsString()
    @IsOptional()
    referenceId?: string;

    @ApiProperty({ description: 'Income account ID (usually rental income)' })
    @IsString()
    @IsNotEmpty()
    incomeAccountId: string;
}

// Check deposit DTO
export class RecordCheckDepositDto {
    @ApiProperty({ description: 'Bank account for deposit' })
    @IsString()
    @IsNotEmpty()
    bankAccountId: string;

    @ApiProperty({ type: [Object], description: 'Array of checks to deposit' })
    @IsArray()
    checks: {
        amount: string;
        checkNumber: string;
        payerName: string;
        description: string;
        incomeAccountId: string;
        referenceId?: string;
    }[];

    @ApiProperty({ description: 'Deposit date' })
    @IsDateString()
    depositDate: string;

    @ApiPropertyOptional({ description: 'Bank deposit slip number' })
    @IsString()
    @IsOptional()
    depositSlipNumber?: string;
}