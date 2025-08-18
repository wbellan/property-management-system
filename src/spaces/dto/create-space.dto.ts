// src/spaces/dto/create-space.dto.ts
import { IsString, IsInt, IsOptional, Min, IsEnum, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SpaceType {
    APARTMENT = 'Apartment',
    OFFICE = 'Office',
    RETAIL = 'Retail',
    STORAGE = 'Storage',
    WAREHOUSE = 'Warehouse',
    STUDIO = 'Studio',
    LOFT = 'Loft',
    TOWNHOUSE = 'Townhouse',
}

export class CreateSpaceDto {
    @ApiProperty({ example: 'A101' })
    @IsString()
    unitNumber: string;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    floor?: number;

    @ApiProperty({ enum: SpaceType, example: SpaceType.APARTMENT })
    @IsEnum(SpaceType)
    spaceType: SpaceType;

    @ApiProperty({ example: 2, required: false })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(0)
    bedrooms?: number;

    @ApiProperty({ example: 1.5, required: false })
    @IsOptional()
    @Transform(({ value }) => parseFloat(value))
    @IsNumber()
    @Min(0)
    bathrooms?: number;

    @ApiProperty({ example: 1200, required: false })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    squareFeet?: number;

    @ApiProperty({ example: 'Spacious 2-bedroom apartment with balcony', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'property-id-123' })
    @IsString()
    propertyId: string;
}