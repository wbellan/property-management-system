// src/financials/dto/create-ledger-entry.dto.ts
import { IsString, IsDecimal, IsDateString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class CreateLedgerEntryDto {
    @ApiProperty({ example: 'bank-ledger-id-123' })
    @IsString()
    bankLedgerId: string;

    @ApiProperty({ example: 'chart-account-id-123' })
    @IsString()
    chartAccountId: string;

    @ApiProperty({ enum: TransactionType, example: TransactionType.DEBIT })
    @IsEnum(TransactionType)
    transactionType: TransactionType;

    @ApiProperty({ example: 1500.00 })
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    amount: number;

    @ApiProperty({ example: 'Monthly rent payment from John Doe' })
    @IsString()
    description: string;

    @ApiProperty({ example: 'REF-12345', required: false })
    @IsOptional()
    @IsString()
    referenceNumber?: string;

    @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
    @IsDateString()
    transactionDate: string;

    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @IsBoolean()
    reconciled?: boolean = false;
}