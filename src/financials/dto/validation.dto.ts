// File: src/financials/dto/validation.dto.ts

import { CreateInvoiceLineItemDto } from "./invoice-line-item.dto";

export class ValidateInvoiceDto {
    lineItems?: CreateInvoiceLineItemDto[];
    taxAmount?: number;
    discountAmount?: number;
}

export class ValidatePaymentApplicationDto {
    paymentId: string;
    invoiceId: string;
    appliedAmount: number;
}