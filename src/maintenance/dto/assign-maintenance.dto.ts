// src/maintenance/dto/assign-maintenance.dto.ts
import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignMaintenanceDto {
    @ApiProperty({ example: 'vendor-id-123' })
    @IsString()
    vendorId: string;

    @ApiProperty({ example: '2024-01-20T09:00:00.000Z', required: false })
    @IsOptional()
    @IsDateString()
    scheduledDate?: string;

    @ApiProperty({ example: 'Assigned to HVAC specialist for AC repair', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}