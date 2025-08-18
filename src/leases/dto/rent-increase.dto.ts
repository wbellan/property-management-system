// src/leases/dto/rent-increase.dto.ts
import { IsDecimal, IsDateString, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RentIncreaseDto {
    @ApiProperty({ example: 1650.00 })
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    newRent: number;

    @ApiProperty({ example: '2024-06-01T00:00:00.000Z' })
    @IsDateString()
    effectiveDate: string;

    @ApiProperty({ example: 'Annual rent increase per lease agreement', required: false })
    @IsOptional()
    @IsString()
    reason?: string;
}