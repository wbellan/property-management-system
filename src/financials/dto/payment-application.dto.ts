// File: src/financials/dto/payment-application.dto.ts

import { IsString, IsNumber, IsOptional, Min, IsPositive, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentApplicationDto {
    @IsString()
    paymentId: string;

    @IsString()
    invoiceId: string;

    @IsNumber()
    @IsPositive()
    appliedAmount: number;

    @IsOptional()
    @IsDateString()
    appliedDate?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdatePaymentApplicationDto {
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0.01)
    appliedAmount?: number;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class BulkPaymentApplicationDto {
    @IsString()
    paymentId: string;

    @IsString()
    invoiceId: string;

    @IsNumber()
    @Type(() => Number)
    @Min(0.01)
    appliedAmount: number;

    @IsOptional()
    @IsString()
    notes?: string;
}