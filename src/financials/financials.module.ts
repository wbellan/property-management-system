// ===== COMPLETE FINANCIAL MODULE CONFIGURATION =====
// src/financials/financials.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// Services
import { FinancialsService } from './financials.service';
import { EnhancedInvoiceService } from './enhanced-invoice.service';
import { PaymentApplicationService } from './payment-application.service';
import { InvoiceWorkflowService } from './invoice-workflow.service';

// Controllers
import { FinancialsController } from './financials.controller';
import { EnhancedInvoiceController } from './enhanced-invoice.controller';
import { PaymentApplicationController } from './payment-application.controller';
import { InvoiceWorkflowController } from './invoice-workflow.controller';

@Module({
    imports: [
        ScheduleModule.forRoot(), // Enable cron jobs for automated workflows
    ],
    controllers: [
        FinancialsController,           // Basic financial operations
        EnhancedInvoiceController,      // Advanced invoice management
        PaymentApplicationController,   // Payment matching and application
        InvoiceWorkflowController,      // Workflow automation and triggers
    ],
    providers: [
        PrismaService,                  // Database service
        FinancialsService,              // Basic financial operations
        EnhancedInvoiceService,         // Enhanced invoice business logic
        PaymentApplicationService,      // Payment application logic
        InvoiceWorkflowService,         // Automated workflow processing
    ],
    exports: [
        FinancialsService,
        EnhancedInvoiceService,
        PaymentApplicationService,
        InvoiceWorkflowService,
    ],
})
export class FinancialsModule { }