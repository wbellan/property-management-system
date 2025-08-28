import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, IsBoolean, Min, IsPositive, IsNotEmpty } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CreateInvoiceLineItemDto } from './invoice-line-item.dto';
import { InvoiceType, InvoiceStatus } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';

// export enum InvoiceType {
//     RENT = 'RENT',
//     LATE_FEE = 'LATE_FEE',
//     UTILITY = 'UTILITY',
//     REPAIR = 'REPAIR',
//     DEPOSIT = 'DEPOSIT',
//     OTHER = 'OTHER'
// }

// export enum InvoiceStatus {
//     DRAFT = 'DRAFT',
//     SENT = 'SENT',
//     VIEWED = 'VIEWED',
//     PARTIAL_PAID = 'PARTIAL_PAID',
//     PAID = 'PAID',
//     OVERDUE = 'OVERDUE',
//     VOID = 'VOID',
//     CANCELLED = 'CANCELLED'
// }

export class CreateInvoiceDto {
    @IsString()
    @IsNotEmpty()
    entityId: string;

    @IsEnum(InvoiceType)
    @IsOptional()
    invoiceType?: InvoiceType;

    @IsOptional()
    @IsString()
    tenantId?: string;

    @IsOptional()
    @IsString()
    vendorId?: string;

    @IsOptional()
    @IsString()
    customerName?: string;

    @IsOptional()
    @IsString()
    customerEmail?: string;

    @IsOptional()
    @IsString()
    propertyId?: string;

    @IsOptional()
    @IsString()
    spaceId?: string;

    @IsOptional()
    @IsString()
    leaseId?: string;

    @IsOptional()
    @IsDateString()
    issueDate?: string;

    @IsDateString()
    @IsNotEmpty()
    dueDate: string;

    @IsOptional()
    @IsNumber()
    taxAmount?: number;

    @IsOptional()
    @IsNumber()
    discountAmount?: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    terms?: string;

    @IsOptional()
    @IsString()
    memo?: string;

    @IsOptional()
    @IsString()
    internalNotes?: string;

    @IsOptional()
    @IsNumber()
    lateFeeAmount?: number;

    @IsOptional()
    @IsNumber()
    lateFeeDays?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateInvoiceLineItemDto)
    lineItems: CreateInvoiceLineItemDto[];
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) { }

// // ===== INVOICE LINE ITEM DTO =====
// export class CreateInvoiceLineItemDto {
//     @IsString()
//     description: string;

//     @IsNumber()
//     @Min(0.01)
//     quantity: number;

//     @IsNumber()
//     @IsPositive()
//     unitPrice: number;

//     @IsOptional()
//     @IsString()
//     chartAccountId?: string;

//     @IsOptional()
//     @IsString()
//     propertyId?: string;

//     @IsOptional()
//     @IsString()
//     spaceId?: string;
// }