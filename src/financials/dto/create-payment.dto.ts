// File: src/financials/dto/create-payment.dto.ts

import {
    IsString,
    IsNumber,
    IsOptional,
    IsEnum,
    IsDateString,
    IsArray,
    ValidateNested,
    IsEmail,
    Min,
    Max,
    IsPositive
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { BulkPaymentApplicationDto, CreatePaymentApplicationDto } from './payment-application.dto';

export class CreatePaymentDto {
    @IsString()
    entityId: string;

    @IsOptional()
    @IsString()
    paymentNumber?: string;

    @IsEnum(PaymentType)
    paymentType: PaymentType;

    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @IsOptional()
    @IsString()
    paymentSource?: string;

    @IsOptional()
    @IsString()
    tenantId?: string;

    @IsOptional()
    @IsString()
    vendorId?: string;

    @IsOptional()
    @IsString()
    payerId?: string;

    @IsString()
    payerName?: string;

    @IsOptional()
    @IsEmail()
    payerEmail?: string;

    @IsNumber()
    @Type(() => Number)
    @Min(0.01)
    amount: number;

    @IsOptional()
    @IsDateString()
    paymentDate?: string;

    @IsOptional()
    @IsDateString()
    receivedDate?: string;

    @IsOptional()
    @IsString()
    bankLedgerId?: string;

    @IsOptional()
    @IsString()
    referenceNumber?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    processingFee?: number;

    @IsOptional()
    @IsEnum(PaymentStatus)
    status?: PaymentStatus;

    @IsOptional()
    @IsString()
    memo?: string;

    @IsOptional()
    @IsString()
    internalNotes?: string;

    // Auto-application to invoices
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePaymentApplicationDto)
    invoiceApplications?: CreatePaymentApplicationDto[];
}

export class UpdatePaymentDto {
    @IsOptional()
    @IsString()
    entityId?: string;

    @IsOptional()
    @IsString()
    paymentNumber?: string;

    @IsOptional()
    @IsEnum(PaymentType)
    paymentType?: PaymentType;

    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @IsOptional()
    @IsString()
    paymentSource?: string;

    @IsOptional()
    @IsString()
    tenantId?: string;

    @IsOptional()
    @IsString()
    vendorId?: string;

    @IsOptional()
    @IsString()
    payerName?: string;

    @IsOptional()
    @IsString()
    payerEmail?: string;

    @IsOptional()
    @IsNumber()
    @IsPositive()
    amount?: number;

    @IsOptional()
    @IsDateString()
    paymentDate?: string;

    @IsOptional()
    @IsDateString()
    receivedDate?: string;

    @IsOptional()
    @IsString()
    referenceNumber?: string;

    @IsOptional()
    @IsString()
    bankLedgerId?: string;

    @IsOptional()
    @IsEnum(PaymentStatus)
    status?: PaymentStatus;

    @IsOptional()
    @IsString()
    memo?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class PaymentQueryDto {
    @IsOptional()
    @IsString()
    entityId?: string;

    @IsOptional()
    @IsEnum(PaymentStatus)
    status?: PaymentStatus;

    @IsOptional()
    @IsEnum(PaymentType)
    paymentType?: PaymentType;

    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @IsOptional()
    @IsString()
    payerId?: string;

    @IsOptional()
    @IsString()
    bankLedgerId?: string;

    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    amountFrom?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    amountTo?: number;

    @IsOptional()
    @IsString()
    unapplied?: string; // 'true' or 'false'

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    @Max(100)
    limit?: number = 50;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    offset?: number = 0;
}

export class UpdatePaymentStatusDto {
    @IsEnum(PaymentStatus)
    status: PaymentStatus;
}

export class BulkApplyPaymentsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkPaymentApplicationDto)
    applications: BulkPaymentApplicationDto[];
}