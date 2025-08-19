// src/reports/dto/maintenance-analytics.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class MaintenanceAnalyticsDto {
    @ApiProperty({ example: 'entity-id-123' })
    @IsString()
    entityId: string;

    @ApiProperty({ example: '2024-01-01' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2024-12-31' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ required: false, example: 'property-id-123' })
    @IsOptional()
    @IsString()
    propertyId?: string;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    vendorIds?: string[];

    @ApiProperty({ required: false, type: [String], example: ['EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    priorities?: string[];

    @ApiProperty({ required: false, type: [String], example: ['HVAC', 'Plumbing', 'Electrical'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categories?: string[];

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeVendorAnalysis?: boolean;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeCostAnalysis?: boolean;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includePredictive?: boolean;
}
