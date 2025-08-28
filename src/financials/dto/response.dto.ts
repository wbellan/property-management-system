// File: src/financials/dto/response.dto.ts

export class InvoiceResponseDto {
    id: string;
    entityId: string;
    invoiceNumber: string;
    invoiceType: string;
    tenantId?: string;
    vendorId?: string;
    customerName?: string;
    customerEmail?: string;
    propertyId?: string;
    spaceId?: string;
    leaseId?: string;
    issueDate?: Date;
    dueDate: Date;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    description?: string;
    terms?: string;
    memo?: string;
    internalNotes?: string;
    isRecurring: boolean;
    parentInvoiceId?: string;
    recurringRule?: string;
    lateFeeApplied: boolean;
    lateFeeDays?: number;
    lateFeeAmount?: number;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    lineItems?: InvoiceLineItemResponseDto[];
    paymentApplications?: PaymentApplicationResponseDto[];
    attachments?: AttachmentResponseDto[];
    tenant?: any;
    vendor?: any;
    property?: any;
    space?: any;
    lease?: any;

    // Calculated fields
    paymentSummary?: {
        totalApplied: number;
        remainingBalance: number;
        isFullyPaid: boolean;
    };
}

export class InvoiceLineItemResponseDto {
    id: string;
    invoiceId: string;
    lineNumber: number;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    chartAccountId?: string;
    propertyId?: string;
    spaceId?: string;
    itemCode?: string;
    startDate?: Date;
    endDate?: Date;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    chartAccount?: any;
    property?: any;
    space?: any;
}

export class PaymentResponseDto {
    id: string;
    entityId: string;
    paymentNumber: string;
    paymentType: string;
    paymentMethod: string;
    payerId?: string;
    payerName: string;
    payerEmail?: string;
    amount: number;
    paymentDate: Date;
    receivedDate?: Date;
    bankLedgerId?: string;
    referenceNumber?: string;
    status: string;
    processingStatus: string;
    processingFee?: number;
    failureReason?: string;
    retryCount: number;
    nextRetryDate?: Date;
    depositId?: string;
    isDeposited: boolean;
    depositDate?: Date;
    memo?: string;
    internalNotes?: string;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    payer?: any;
    bankLedger?: any;
    paymentApplications?: PaymentApplicationResponseDto[];
    attachments?: AttachmentResponseDto[];

    // Calculated fields
    appliedAmount?: number;
    unappliedAmount?: number;
    isFullyApplied?: boolean;
}

export class PaymentApplicationResponseDto {
    id: string;
    paymentId: string;
    invoiceId: string;
    appliedAmount: number;
    appliedDate: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    payment?: any;
    invoice?: any;
}

export class AttachmentResponseDto {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    uploadedBy?: string;
    createdAt: Date;

    // Relations
    uploader?: any;
}

export class PaginationResponseDto {
    total: number;
    limit: number;
    offset: number;
    pages: number;
}

export class InvoiceListResponseDto {
    invoices: InvoiceResponseDto[];
    pagination: PaginationResponseDto;
}

export class PaymentListResponseDto {
    payments: PaymentResponseDto[];
    pagination: PaginationResponseDto;
}

export class AgingReportResponseDto {
    asOfDate: Date;
    buckets: {
        current: any[];
        thirtyDays: any[];
        sixtyDays: any[];
        ninetyDaysPlus: any[];
    };
    totals: {
        current: number;
        thirtyDays: number;
        sixtyDays: number;
        ninetyDaysPlus: number;
        grandTotal: number;
    };
}

export class PaymentSummaryResponseDto {
    totalPayments: number;
    totalAmount: number;
    appliedAmount: number;
    unappliedAmount: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byMethod: Record<string, number>;
}
