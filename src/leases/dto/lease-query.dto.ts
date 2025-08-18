// src/leases/dto/lease-query.dto.ts
import { IsOptional, IsString, IsInt, Min, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LeaseStatus } from '@prisma/client';

export class LeaseQueryDto {
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

    @ApiProperty({ required: false, example: 'John Doe' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ enum: LeaseStatus, required: false })
    @IsOptional()
    @IsEnum(LeaseStatus)
    status?: LeaseStatus;

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

    @ApiProperty({ required: false, example: '2024-01-01' })
    @IsOptional()
    @IsDateString()
    startDateFrom?: string;

    @ApiProperty({ required: false, example: '2024-12-31' })
    @IsOptional()
    @IsDateString()
    startDateTo?: string;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    expiringWithin30Days?: boolean;

    @ApiProperty({ required: false, example: 'entity-id-123' })
    @IsOptional()
    @IsString()
    entityId?: string;
}