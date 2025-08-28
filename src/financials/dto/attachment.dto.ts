// File: src/financials/dto/attachment.dto.ts

import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceAttachmentDto {
    @IsString()
    invoiceId: string;

    @IsString()
    fileName: string;

    @IsString()
    fileUrl: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    fileSize?: number;

    @IsOptional()
    @IsString()
    mimeType?: string;
}

export class CreatePaymentAttachmentDto {
    @IsString()
    paymentId: string;

    @IsString()
    fileName: string;

    @IsString()
    fileUrl: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    fileSize?: number;

    @IsOptional()
    @IsString()
    mimeType?: string;
}