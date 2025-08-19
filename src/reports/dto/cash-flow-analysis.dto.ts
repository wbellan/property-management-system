// src/reports/dto/cash-flow-analysis.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GroupByPeriod } from './report-query.dto';
import { Transform } from 'class-transformer';

export class CashFlowAnalysisDto {
    @ApiProperty({ example: 'entity-id-123' })
    @IsString()
    entityId: string;

    @ApiProperty({ example: '2024-01-01' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2024-12-31' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ enum: GroupByPeriod, example: GroupByPeriod.MONTH })
    @IsEnum(GroupByPeriod)
    groupBy: GroupByPeriod;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    propertyIds?: string[];

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeProjections?: boolean;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeSeasonality?: boolean;

    @ApiProperty({ required: false, example: 12 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    projectionMonths?: number;
}