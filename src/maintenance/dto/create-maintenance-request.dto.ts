// src/maintenance/dto/create-maintenance-request.dto.ts
import { IsString, IsOptional, IsEnum, IsDecimal, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MaintenancePriority, MaintenanceStatus } from '@prisma/client';

export class CreateMaintenanceRequestDto {
    @ApiProperty({ example: 'property-id-123' })
    @IsString()
    propertyId: string;

    @ApiProperty({ example: 'space-id-123', required: false })
    @IsOptional()
    @IsString()
    spaceId?: string;

    @ApiProperty({ example: 'tenant-user-id-123' })
    @IsString()
    tenantId: string;

    @ApiProperty({ example: 'HVAC not working' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'The air conditioning unit in the living room is not cooling properly. Temperature is stuck at 78 degrees.' })
    @IsString()
    description: string;

    @ApiProperty({ enum: MaintenancePriority, example: MaintenancePriority.HIGH })
    @IsEnum(MaintenancePriority)
    priority: MaintenancePriority;

    @ApiProperty({ enum: MaintenanceStatus, example: MaintenanceStatus.OPEN, required: false })
    @IsOptional()
    @IsEnum(MaintenanceStatus)
    status?: MaintenanceStatus = MaintenanceStatus.OPEN;

    @ApiProperty({ example: 150.00, required: false })
    @IsOptional()
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    estimatedCost?: number;
}