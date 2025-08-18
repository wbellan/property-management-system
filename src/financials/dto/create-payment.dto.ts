// src/financials/dto/create-payment.dto.ts
import { IsString, IsDecimal, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
    @ApiProperty({ example: 'invoice-id-123' })
    @IsString()
    invoiceId: string;

    @ApiProperty({ example: 1500.00 })
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    amount: number;

    @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
    @IsDateString()
    paymentDate: string;

    @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.ONLINE })
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.COMPLETED, required: false })
    @IsOptional()
    @IsEnum(PaymentStatus)
    status?: PaymentStatus = PaymentStatus.PENDING;

    @ApiProperty({ example: 'TXN-12345', required: false })
    @IsOptional()
    @IsString()
    referenceNumber?: string;

    @ApiProperty({ example: 'Online payment via tenant portal', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}