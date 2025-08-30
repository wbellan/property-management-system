import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BankLedgerController } from './controllers/bank-ledger.controller';
import { ChartAccountsController } from './controllers/chart-accounts.controller';
import { BankLedgerService } from './services/bank-ledger.service';
import { ChartAccountsService } from './services/chart-accounts.service';
import { BalanceCalculatorService } from './services/balance-calculator.service';
import { DefaultChartSetupService } from './services/default-chart-setup.service';
import { LedgerEntriesService } from './services/ledger-entries.service';
import { LedgerEntriesController } from './controllers/ledger-entries.controller';
import { ReconciliationController } from './controllers/reconciliation.controller';
import { ReconciliationService } from './services/reconciliation.service';
import { FinancialReportsController } from './controllers/financial-reports.controller';
import { AuditController } from './controllers/audit.controller';
import { FinancialReportsService } from './services/financial-reports.service';
import { AuditService } from './services/audit.service';

@Module({
    imports: [PrismaModule],
    controllers: [
        BankLedgerController,
        ChartAccountsController,
        LedgerEntriesController,
        ReconciliationController,
        FinancialReportsController,
        AuditController
    ],
    providers: [
        BankLedgerService,
        ChartAccountsService,
        LedgerEntriesService,
        BalanceCalculatorService,
        DefaultChartSetupService,
        ReconciliationService,
        FinancialReportsService,
        AuditService
    ],
    exports: [
        BankLedgerService,
        ChartAccountsService,
        LedgerEntriesService,
        BalanceCalculatorService,
        ReconciliationService,
        FinancialReportsService,
        AuditService
    ],
})

export class BankingModule { }