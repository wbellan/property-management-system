// src/maintenance/dto/update-maintenance-request.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateMaintenanceRequestDto } from './create-maintenance-request.dto';
import { IsOptional, IsDecimal, IsDateString, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMaintenanceRequestDto extends PartialType(CreateMaintenanceRequestDto) {
    @ApiProperty({ example: 175.50, required: false })
    @IsOptional()
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    actualCost?: number;

    @ApiProperty({ example: '2024-01-15T10:30:00.000Z', required: false })
    @IsOptional()
    @IsDateString()
    completedAt?: string;

    @ApiProperty({ example: 'Replaced HVAC filter and recharged refrigerant. System now cooling properly.', required: false })
    @IsOptional()
    @IsString()
    completionNotes?: string;
}