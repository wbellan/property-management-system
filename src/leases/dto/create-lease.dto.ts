// // src/leases/dto/create-lease.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { LeaseStatus } from '@prisma/client';

export class CreateLeaseDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    spaceId!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    propertyId!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    tenantId!: string;

    @ApiProperty({ example: '2025-08-01' })
    @Transform(({ value }) => (value instanceof Date ? value : new Date(value)))
    startDate!: Date;

    @ApiProperty({ example: '2026-07-31' })
    @Transform(({ value }) => (value instanceof Date ? value : new Date(value)))
    endDate!: Date;

    @ApiProperty({ example: 2500.0 })
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    monthlyRent!: number;

    @ApiProperty({ example: 2500.0 })
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    securityDeposit!: number;

    @ApiProperty({ enum: LeaseStatus, required: false, default: LeaseStatus.ACTIVE })
    @IsOptional()
    @IsEnum(LeaseStatus)
    status?: LeaseStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    renewalTerms?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    specialTerms?: string;

    @ApiProperty({ required: false, example: 350.0 })
    @IsOptional()
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    nnnExpenses?: number;

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return value === 'true';
        return Boolean(value);
    })
    @IsBoolean()
    utilitiesIncluded?: boolean;

    @ApiProperty({ required: false, example: 300.0 })
    @IsOptional()
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    petDeposit?: number;
}

// import { IsString, IsDateString, IsDecimal, IsOptional, IsBoolean, IsEnum, IsUUID } from 'class-validator';
// import { Transform } from 'class-transformer';
// import { ApiProperty } from '@nestjs/swagger';
// import { LeaseStatus } from '@prisma/client';

// export class CreateLeaseDto {
//     @ApiProperty({ example: 'space-id-123' })
//     @IsString()
//     spaceId: string;

//     @ApiProperty({ example: 'tenant-user-id-123' })
//     @IsString()
//     tenantId: string;

//     @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
//     @IsDateString()
//     startDate: string;

//     @ApiProperty({ example: '2024-12-31T23:59:59.999Z' })
//     @IsDateString()
//     endDate: string;

//     @ApiProperty({ example: 1500.00 })
//     @Transform(({ value }) => parseFloat(value))
//     @IsDecimal({ decimal_digits: '0,2' })
//     monthlyRent: number;

//     @ApiProperty({ example: 1500.00 })
//     @Transform(({ value }) => parseFloat(value))
//     @IsDecimal({ decimal_digits: '0,2' })
//     securityDeposit: number;

//     @ApiProperty({ enum: LeaseStatus, example: LeaseStatus.DRAFT, required: false })
//     @IsOptional()
//     @IsEnum(LeaseStatus)
//     status?: LeaseStatus = LeaseStatus.DRAFT;

//     @ApiProperty({ example: 'Standard 12-month residential lease agreement', required: false })
//     @IsOptional()
//     @IsString()
//     leaseTerms?: string;

//     @ApiProperty({ example: 150.00, required: false })
//     @IsOptional()
//     @Transform(({ value }) => parseFloat(value))
//     @IsDecimal({ decimal_digits: '0,2' })
//     nnnExpenses?: number;

//     @ApiProperty({ example: false, required: false })
//     @IsOptional()
//     @IsBoolean()
//     utilitiesIncluded?: boolean = false;

//     @ApiProperty({ example: 200.00, required: false })
//     @IsOptional()
//     @Transform(({ value }) => parseFloat(value))
//     @IsDecimal({ decimal_digits: '0,2' })
//     petDeposit?: number;
// }
