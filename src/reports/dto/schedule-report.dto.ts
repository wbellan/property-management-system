// src/reports/dto/schedule-report.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportFrequency } from './report-query.dto';

export class ScheduleReportDto {
    @ApiProperty({ example: 'monthly-financial-summary' })
    @IsString()
    reportType: string;

    @ApiProperty({ example: 'entity-id-123' })
    @IsString()
    entityId: string;

    @ApiProperty({ enum: ReportFrequency, example: ReportFrequency.MONTHLY })
    @IsEnum(ReportFrequency)
    frequency: ReportFrequency;

    @ApiProperty({ type: [String], example: ['admin@company.com', 'manager@company.com'] })
    @IsArray()
    @IsString({ each: true })
    recipients: string[];

    @ApiProperty({ required: false, type: 'object' })
    @IsOptional()
    parameters?: Record<string, any>;

    @ApiProperty({ required: false, example: 'Monthly Financial Report' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ required: false, example: 'Automated monthly financial summary report' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean = true;
}