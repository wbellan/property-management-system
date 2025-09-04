// src/reports/dto/report-query.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ReportFormat {
    JSON = 'json',
    CSV = 'csv',
    HTML = 'html',
    PDF = 'pdf',
}

export enum ReportFrequency {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly',
    YEARLY = 'yearly',
}

export enum GroupByPeriod {
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
    QUARTER = 'quarter',
    YEAR = 'year',
}

export enum ComparisonType {
    PROPERTIES = 'properties',
    PERIODS = 'periods',
    BENCHMARKS = 'benchmarks',
}

export class ReportQueryDto {
    @ApiProperty({ required: false, example: '2024-01-01' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({ required: false, example: '2024-12-31' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({ required: false, example: 'property-id-123' })
    @IsOptional()
    @IsString()
    propertyId?: string;

    @ApiProperty({ required: false, type: [String], example: ['property1', 'property2'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    propertyIds?: string[];

    @ApiProperty({ enum: GroupByPeriod, required: false, example: GroupByPeriod.MONTH })
    @IsOptional()
    @IsEnum(GroupByPeriod)
    groupBy?: GroupByPeriod;

    @ApiProperty({ enum: ReportFormat, required: false, example: ReportFormat.JSON })
    @IsOptional()
    @IsEnum(ReportFormat)
    format?: ReportFormat;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeProjections?: boolean;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeComparisons?: boolean;
}