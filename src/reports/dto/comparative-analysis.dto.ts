// src/reports/dto/comparative-analysis.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComparisonType } from './report-query.dto';

export class ComparativeAnalysisDto {
    @ApiProperty({ example: 'entity-id-123' })
    @IsString()
    entityId: string;

    @ApiProperty({ enum: ComparisonType, example: ComparisonType.PROPERTIES })
    @IsEnum(ComparisonType)
    compareType: ComparisonType;

    @ApiProperty({ example: '2024-01-01' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2024-12-31' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    propertyIds?: string[];

    @ApiProperty({ required: false, type: [String], example: ['revenue', 'occupancy', 'maintenance'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    metrics?: string[];

    @ApiProperty({ required: false, example: '2023-01-01' })
    @IsOptional()
    @IsDateString()
    comparisonStartDate?: string;

    @ApiProperty({ required: false, example: '2023-12-31' })
    @IsOptional()
    @IsDateString()
    comparisonEndDate?: string;
}