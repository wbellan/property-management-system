// src/financials/dto/update-invoice.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateInvoiceDto } from './create-invoice.dto';

export class UpdateInvoiceDto extends PartialType(
    OmitType(CreateInvoiceDto, ['leaseId'] as const),
) { }