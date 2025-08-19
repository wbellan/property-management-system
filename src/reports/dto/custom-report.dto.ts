// src/reports/dto/custom-report.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GroupByPeriod } from './report-query.dto';

export class CustomReportDto {
    @ApiProperty({ example: 'financial-performance' })
    @IsString()
    reportType: string;

    @ApiProperty({ example: 'entity-id-123' })
    @IsString()
    entityId: string;

    @ApiProperty({ required: false, example: '2024-01-01' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({ required: false, example: '2024-12-31' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    propertyIds?: string[];

    @ApiProperty({ required: false, type: [String], example: ['revenue', 'expenses', 'profit'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    metrics?: string[];

    @ApiProperty({ enum: GroupByPeriod, required: false })
    @IsOptional()
    @IsEnum(GroupByPeriod)
    groupBy?: GroupByPeriod;

    @ApiProperty({ required: false, type: 'object' })
    @IsOptional()
    filters?: Record<string, any>;
}