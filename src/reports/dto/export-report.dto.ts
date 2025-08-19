// src/reports/dto/export-report.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportFormat } from './report-query.dto';

export class ExportReportDto {
    @ApiProperty({ example: 'rent-roll' })
    @IsString()
    reportType: string;

    @ApiProperty({ example: 'entity-id-123' })
    @IsString()
    entityId: string;

    @ApiProperty({ enum: ReportFormat, example: ReportFormat.XLSX })
    @IsEnum(ReportFormat)
    format: ReportFormat;

    @ApiProperty({ required: false, example: '2024-01-01' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({ required: false, example: '2024-12-31' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({ required: false, type: 'object' })
    @IsOptional()
    options?: {
        includeCharts?: boolean;
        includeRawData?: boolean;
        templateId?: string;
        customFields?: string[];
    };
}