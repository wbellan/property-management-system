// src/reports/dto/profit-loss-query.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GroupByPeriod } from './report-query.dto';
import { Transform } from 'class-transformer';

export class ProfitLossQueryDto {
    @ApiProperty({ example: 'entity-id-123' })
    @IsString()
    entityId: string;

    @ApiProperty({ example: '2024-01-01' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2024-12-31' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ enum: GroupByPeriod, required: false, example: GroupByPeriod.MONTH })
    @IsOptional()
    @IsEnum(GroupByPeriod)
    groupBy?: GroupByPeriod;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    propertyIds?: string[];

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeComparison?: boolean;

    @ApiProperty({ required: false, example: '2023-01-01' })
    @IsOptional()
    @IsDateString()
    comparisonStartDate?: string;

    @ApiProperty({ required: false, example: '2023-12-31' })
    @IsOptional()
    @IsDateString()
    comparisonEndDate?: string;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeBreakdown?: boolean;
}