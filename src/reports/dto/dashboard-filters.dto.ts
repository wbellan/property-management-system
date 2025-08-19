// src/reports/dto/dashboard-filters.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class DashboardFiltersDto {
    @ApiProperty({ required: false, example: 'property-id-123' })
    @IsOptional()
    @IsString()
    propertyId?: string;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    propertyIds?: string[];

    @ApiProperty({ required: false, example: '2024-01-01' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiProperty({ required: false, example: '2024-12-31' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @ApiProperty({ required: false, type: [String], example: ['financial', 'occupancy', 'maintenance'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    modules?: string[];

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeAlerts?: boolean;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeActivityFeed?: boolean;
}