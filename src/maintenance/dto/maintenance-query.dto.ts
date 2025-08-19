// src/maintenance/dto/maintenance-query.dto.ts
import { IsOptional, IsString, IsInt, Min, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceStatus, MaintenancePriority } from '@prisma/client';
import { VendorType } from './create-vendor.dto';

export class MaintenanceQueryDto {
    @ApiProperty({ required: false, example: 1 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ required: false, example: 10 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiProperty({ required: false, example: 'HVAC' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ enum: MaintenanceStatus, required: false })
    @IsOptional()
    @IsEnum(MaintenanceStatus)
    status?: MaintenanceStatus;

    @ApiProperty({ enum: MaintenancePriority, required: false })
    @IsOptional()
    @IsEnum(MaintenancePriority)
    priority?: MaintenancePriority;

    @ApiProperty({ required: false, example: 'property-id-123' })
    @IsOptional()
    @IsString()
    propertyId?: string;

    @ApiProperty({ required: false, example: 'space-id-123' })
    @IsOptional()
    @IsString()
    spaceId?: string;

    @ApiProperty({ required: false, example: 'tenant-id-123' })
    @IsOptional()
    @IsString()
    tenantId?: string;

    @ApiProperty({ required: false, example: 'vendor-id-123' })
    @IsOptional()
    @IsString()
    vendorId?: string;

    @ApiProperty({ required: false, example: '2024-01-01' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({ required: false, example: '2024-12-31' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({ required: false, example: 'entity-id-123' })
    @IsOptional()
    @IsString()
    entityId?: string;
}

export class VendorQueryDto {
    @ApiProperty({ required: false, example: 1 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ required: false, example: 10 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiProperty({ required: false, example: 'ABC HVAC' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ enum: VendorType, required: false })
    @IsOptional()
    @IsEnum(VendorType)
    vendorType?: VendorType;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ required: false, example: 'entity-id-123' })
    @IsOptional()
    @IsString()
    entityId?: string;
}