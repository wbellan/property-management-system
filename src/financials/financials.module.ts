// src/financials/financials.module.ts
import { Module } from '@nestjs/common';
import { FinancialsService } from './financials.service';
import { FinancialsController } from './financials.controller';

@Module({
    controllers: [FinancialsController],
    providers: [FinancialsService],
    exports: [FinancialsService],
})
export class FinancialsModule { }