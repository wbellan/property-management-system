import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, IsBoolean, Min, IsPositive } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CreateInvoiceLineItemDto } from './invoice-line-item.dto';
import { InvoiceType, InvoiceStatus } from '@prisma/client';

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
    entityId: string;

    @IsOptional()
    @IsString()
    invoiceNumber?: string; 

    @IsOptional()
    @IsString()
    tenantId?: string;

    @IsOptional()
    @IsString()
    vendorId?: string;

    @IsString()
    billToName: string;

    @IsOptional()
    @IsString()
    billToAddress?: string;

    @IsOptional()
    @IsString()
    billToEmail?: string;

    @IsEnum(InvoiceType)
    invoiceType: InvoiceType;

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
    @IsNumber()
    taxAmount?: number;

    @IsOptional()
    @IsNumber()
    totalAmount?: number; 

    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus; 

    @IsDateString()
    dueDate: string;

    @IsOptional()
    @IsString()
    paymentTerms?: string;

    @IsOptional()
    @IsNumber()
    lateFeeAmount?: number;

    @IsOptional()
    @IsDateString()
    lateFeeDate?: string;

    @IsOptional()
    @IsString()
    description?: string; 

    @IsOptional()
    @IsString()
    memo?: string;

    @IsOptional()
    @IsString()
    internalNotes?: string;

    @IsOptional()
    @IsBoolean()
    isRecurring?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateInvoiceLineItemDto)
    lineItems: CreateInvoiceLineItemDto[];
}

export class UpdateInvoiceDto {
    @IsOptional()
    @IsString()
    entityId?: string;

    @IsOptional()
    @IsString()
    invoiceNumber?: string;

    @IsOptional()
    @IsString()
    tenantId?: string;

    @IsOptional()
    @IsString()
    vendorId?: string;

    @IsOptional()
    @IsString()
    billToName?: string;

    @IsOptional()
    @IsString()
    billToAddress?: string;

    @IsOptional()
    @IsString()
    billToEmail?: string;

    @IsOptional()
    @IsEnum(InvoiceType)
    invoiceType?: InvoiceType;

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
    @IsNumber()
    taxAmount?: number;

    @IsOptional()
    @IsNumber()
    totalAmount?: number;

    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsString()
    paymentTerms?: string;

    @IsOptional()
    @IsNumber()
    lateFeeAmount?: number;

    @IsOptional()
    @IsDateString()
    lateFeeDate?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    memo?: string;

    @IsOptional()
    @IsString()
    internalNotes?: string;

    @IsOptional()
    @IsBoolean()
    isRecurring?: boolean;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateInvoiceLineItemDto)
    lineItems?: CreateInvoiceLineItemDto[];
}

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