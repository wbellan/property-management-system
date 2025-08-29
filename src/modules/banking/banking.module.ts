// import { Module } from '@nestjs/common';
// import { PrismaModule } from '../prisma/prisma.module';
// import { BankLedgerController } from './controllers/bank-ledger.controller';
// import { ChartAccountsController } from './controllers/chart-accounts.controller';
// import { LedgerEntriesController } from './controllers/ledger-entries.controller';
// import { BankLedgerService } from './services/bank-ledger.service';
// import { ChartAccountsService } from './services/chart-accounts.service';
// import { LedgerEntriesService } from './services/ledger-entries.service';
// import { BalanceCalculatorService } from './services/balance-calculator.service';
// import { DefaultChartSetupService } from './services/default-chart-setup.service';

// @Module({
//     imports: [PrismaModule],
//     controllers: [
//         BankLedgerController,
//         ChartAccountsController,
//         LedgerEntriesController,
//     ],
//     providers: [
//         BankLedgerService,
//         ChartAccountsService,
//         LedgerEntriesService,
//         BalanceCalculatorService,
//         DefaultChartSetupService,
//     ],
//     exports: [
//         BankLedgerService,
//         ChartAccountsService,
//         LedgerEntriesService,
//         BalanceCalculatorService,
//     ],
// })
// export class BankingModule { }

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BankLedgerController } from './controllers/bank-ledger.controller';
import { ChartAccountsController } from './controllers/chart-accounts.controller';
import { BankLedgerService } from './services/bank-ledger.service';
import { ChartAccountsService } from './services/chart-accounts.service';
import { BalanceCalculatorService } from './services/balance-calculator.service';
import { DefaultChartSetupService } from './services/default-chart-setup.service';

@Module({
    imports: [PrismaModule],
    controllers: [
        BankLedgerController,
        ChartAccountsController,
    ],
    providers: [
        BankLedgerService,
        ChartAccountsService,
        BalanceCalculatorService,
        DefaultChartSetupService,
    ],
    exports: [
        BankLedgerService,
        ChartAccountsService,
        BalanceCalculatorService,
    ],
})
export class BankingModule { }