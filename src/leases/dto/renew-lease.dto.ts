// src/leases/dto/renew-lease.dto.ts
import { IsDateString, IsDecimal, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RenewLeaseDto {
    @ApiProperty({ example: '2025-12-31T23:59:59.999Z' })
    @IsDateString()
    newEndDate: string;

    @ApiProperty({ example: 1600.00 })
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    newMonthlyRent: number;

    @ApiProperty({ example: 'Lease renewed for another year with rent increase', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}