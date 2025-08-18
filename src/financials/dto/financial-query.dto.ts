// src/financials/dto/financial-query.dto.ts
import { IsOptional, IsString, IsInt, Min, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { InvoiceStatus, PaymentStatus, TransactionType } from '@prisma/client';

export class FinancialQueryDto {
    @ApiProperty({ required: false, example: 1 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ required: false, example: 10 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiProperty({ required: false, example: 'John Doe' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ required: false, example: '2024-01-01' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({ required: false, example: '2024-12-31' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({ required: false, example: 'entity-id-123' })
    @IsOptional()
    @IsString()
    entityId?: string;

    @ApiProperty({ required: false, example: 'property-id-123' })
    @IsOptional()
    @IsString()
    propertyId?: string;
}

export class InvoiceQueryDto extends FinancialQueryDto {
    @ApiProperty({ enum: InvoiceStatus, required: false })
    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus;

    @ApiProperty({ required: false, example: 'lease-id-123' })
    @IsOptional()
    @IsString()
    leaseId?: string;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    overdue?: boolean;
}

export class PaymentQueryDto extends FinancialQueryDto {
    @ApiProperty({ enum: PaymentStatus, required: false })
    @IsOptional()
    @IsEnum(PaymentStatus)
    status?: PaymentStatus;
}

export class LedgerQueryDto extends FinancialQueryDto {
    @ApiProperty({ enum: TransactionType, required: false })
    @IsOptional()
    @IsEnum(TransactionType)
    transactionType?: TransactionType;

    @ApiProperty({ required: false, example: 'bank-ledger-id-123' })
    @IsOptional()
    @IsString()
    bankLedgerId?: string;

    @ApiProperty({ required: false, example: 'chart-account-id-123' })
    @IsOptional()
    @IsString()
    chartAccountId?: string;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    reconciled?: boolean;
}
