// File: src/financials/dto/report.dto.ts

import { IsOptional, IsDateString, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class AgingReportQueryDto {
    @IsString()
    entityId: string;

    @IsOptional()
    @IsDateString()
    asOfDate?: string;
}

export class PaymentSummaryQueryDto {
    @IsString()
    entityId: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}

export class OverdueInvoicesQueryDto {
    @IsString()
    entityId: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    daysOverdue?: number;
}
