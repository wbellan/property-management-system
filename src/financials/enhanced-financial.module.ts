// ===== ENHANCED FINANCIAL MODULE =====
// src/financials/enhanced-financial.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// Services
import { EnhancedInvoiceService } from './enhanced-invoice.service';
import { PaymentApplicationService } from './payment-application.service';
import { InvoiceWorkflowService } from './invoice-workflow.service';

// Controllers
import { EnhancedInvoiceController } from './enhanced-invoice.controller';
import { PaymentApplicationController } from './payment-application.controller';

// Existing services (if you have them)
import { FinancialsService } from './financials.service';

@Module({
    imports: [ScheduleModule.forRoot()],
    controllers: [
        EnhancedInvoiceController,
        PaymentApplicationController
    ],
    providers: [
        PrismaService,
        EnhancedInvoiceService,
        PaymentApplicationService,
        InvoiceWorkflowService,
        FinancialsService
    ],
    exports: [
        EnhancedInvoiceService,
        PaymentApplicationService,
        InvoiceWorkflowService,
        FinancialsService
    ],
})
export class EnhancedFinancialModule { }