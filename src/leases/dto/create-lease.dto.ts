// src/leases/dto/create-lease.dto.ts
import { IsString, IsDateString, IsDecimal, IsOptional, IsBoolean, IsEnum, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LeaseStatus } from '@prisma/client';

export class CreateLeaseDto {
    @ApiProperty({ example: 'space-id-123' })
    @IsString()
    spaceId: string;

    @ApiProperty({ example: 'tenant-user-id-123' })
    @IsString()
    tenantId: string;

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2024-12-31T23:59:59.999Z' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ example: 1500.00 })
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    monthlyRent: number;

    @ApiProperty({ example: 1500.00 })
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    securityDeposit: number;

    @ApiProperty({ enum: LeaseStatus, example: LeaseStatus.DRAFT, required: false })
    @IsOptional()
    @IsEnum(LeaseStatus)
    status?: LeaseStatus = LeaseStatus.DRAFT;

    @ApiProperty({ example: 'Standard 12-month residential lease agreement', required: false })
    @IsOptional()
    @IsString()
    leaseTerms?: string;

    @ApiProperty({ example: 150.00, required: false })
    @IsOptional()
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    nnnExpenses?: number;

    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @IsBoolean()
    utilitiesIncluded?: boolean = false;

    @ApiProperty({ example: 200.00, required: false })
    @IsOptional()
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    petDeposit?: number;
}
