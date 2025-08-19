// src/reports/dto/occupancy-analytics.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GroupByPeriod } from './report-query.dto';
import { Transform } from 'class-transformer';

export class OccupancyAnalyticsDto {
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

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeTrends?: boolean;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeSeasonality?: boolean;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeProjections?: boolean;

    @ApiProperty({ enum: GroupByPeriod, required: false, example: GroupByPeriod.MONTH })
    @IsOptional()
    @IsEnum(GroupByPeriod)
    trendPeriod?: GroupByPeriod;
}