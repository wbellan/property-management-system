// src/modules/banking/dto/payment-integration.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested, IsDecimal, IsDateString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethodType {
    CHECK = 'CHECK',
    CASH = 'CASH',
    ACH = 'ACH',
    WIRE = 'WIRE',
    CREDIT_CARD = 'CREDIT_CARD',
    MONEY_ORDER = 'MONEY_ORDER',
    BANK_TRANSFER = 'BANK_TRANSFER'
}

export class RecordPaymentDto {
    @ApiProperty({ description: 'ID of the bank account to deposit into' })
    @IsString()
    @IsNotEmpty()
    bankAccountId: string;

    @ApiProperty({ description: 'ID of existing payment record (optional)' })
    @IsOptional()
    @IsString()
    paymentId?: string;

    @ApiProperty({ description: 'ID of related invoice (optional)' })
    @IsOptional()
    @IsString()
    invoiceId?: string;

    @ApiProperty({ description: 'Payment amount' })
    @IsDecimal()
    @IsNotEmpty()
    amount: string;

    @ApiProperty({ description: 'Payment method used' })
    @IsEnum(PaymentMethodType)
    paymentMethod: PaymentMethodType;

    @ApiProperty({ description: 'Date when payment was received' })
    @IsDateString()
    paymentDate: string;

    @ApiProperty({ description: 'Payer name or description' })
    @IsString()
    @IsNotEmpty()
    payerName: string;

    @ApiProperty({ description: 'Reference number (check number, transaction ID, etc.)' })
    @IsOptional()
    @IsString()
    referenceNumber?: string;

    @ApiProperty({ description: 'Revenue account ID for categorizing the payment' })
    @IsString()
    @IsNotEmpty()
    revenueAccountId: string;

    @ApiProperty({ description: 'Payment description or memo' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Additional notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class CheckDepositItemDto {
    @ApiProperty({ description: 'Check number' })
    @IsString()
    @IsNotEmpty()
    checkNumber: string;

    @ApiProperty({ description: 'Check amount' })
    @IsDecimal()
    @IsNotEmpty()
    amount: string;

    @ApiProperty({ description: 'Name on the check (payer)' })
    @IsString()
    @IsNotEmpty()
    payerName: string;

    @ApiProperty({ description: 'Revenue account ID for this check' })
    @IsString()
    @IsNotEmpty()
    revenueAccountId: string;

    @ApiProperty({ description: 'Related invoice ID (optional)' })
    @IsOptional()
    @IsString()
    invoiceId?: string;

    @ApiProperty({ description: 'Related payment ID (if payment already exists)' })
    @IsOptional()
    @IsString()
    paymentId?: string;

    @ApiProperty({ description: 'Description or memo for this check' })
    @IsOptional()
    @IsString()
    description?: string;
}

export class RecordCheckDepositDto {
    @ApiProperty({ description: 'Bank account ID where checks are being deposited' })
    @IsString()
    @IsNotEmpty()
    bankAccountId: string;

    @ApiProperty({ description: 'Date of deposit' })
    @IsDateString()
    depositDate: string;

    @ApiProperty({ description: 'Deposit slip number or reference' })
    @IsOptional()
    @IsString()
    depositSlipNumber?: string;

    @ApiProperty({ description: 'List of checks being deposited' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CheckDepositItemDto)
    checks: CheckDepositItemDto[];

    @ApiProperty({ description: 'Total deposit amount (should match sum of checks)' })
    @IsDecimal()
    @IsNotEmpty()
    totalAmount: string;

    @ApiProperty({ description: 'Deposit notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class PaymentBatchItemDto {
    @ApiProperty({ description: 'Existing payment ID' })
    @IsString()
    @IsNotEmpty()
    paymentId: string;

    @ApiProperty({ description: 'Revenue account ID for categorization' })
    @IsString()
    @IsNotEmpty()
    revenueAccountId: string;
}

export class RecordPaymentBatchDto {
    @ApiProperty({ description: 'Bank account ID for batch deposit' })
    @IsString()
    @IsNotEmpty()
    bankAccountId: string;

    @ApiProperty({ description: 'Batch deposit date' })
    @IsDateString()
    depositDate: string;

    @ApiProperty({ description: 'Batch reference number' })
    @IsOptional()
    @IsString()
    batchReference?: string;

    @ApiProperty({ description: 'List of payments to include in batch' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PaymentBatchItemDto)
    payments: PaymentBatchItemDto[];

    @ApiProperty({ description: 'Batch notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class GenerateReceiptDto {
    @ApiProperty({ description: 'Receipt template to use' })
    @IsOptional()
    @IsString()
    template?: string;

    @ApiProperty({ description: 'Include invoice details on receipt' })
    @IsOptional()
    @IsBoolean()
    includeInvoiceDetails?: boolean;

    @ApiProperty({ description: 'Email address to send receipt to' })
    @IsOptional()
    @IsString()
    emailTo?: string;

    @ApiProperty({ description: 'Format for receipt (PDF, HTML, etc.)' })
    @IsOptional()
    @IsString()
    format?: string;
}