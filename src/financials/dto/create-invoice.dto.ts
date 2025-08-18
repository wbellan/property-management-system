// src/financials/dto/create-invoice.dto.ts
import { IsString, IsDecimal, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { InvoiceType, InvoiceStatus } from '@prisma/client';

export class CreateInvoiceDto {
    @ApiProperty({ example: 'lease-id-123' })
    @IsString()
    leaseId: string;

    @ApiProperty({ example: 'INV-2024-001' })
    @IsString()
    invoiceNumber: string;

    @ApiProperty({ enum: InvoiceType, example: InvoiceType.RENT })
    @IsEnum(InvoiceType)
    invoiceType: InvoiceType;

    @ApiProperty({ example: 1500.00 })
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    amount: number;

    @ApiProperty({ example: '2024-02-01T00:00:00.000Z' })
    @IsDateString()
    dueDate: string;

    @ApiProperty({ enum: InvoiceStatus, example: InvoiceStatus.SENT, required: false })
    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus = InvoiceStatus.DRAFT;

    @ApiProperty({ example: 'Monthly rent for January 2024', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'Payment due by the 1st of the month', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}