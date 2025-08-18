// src/properties/dto/create-property.dto.ts
import { IsString, IsInt, IsOptional, Min, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PropertyType {
    RESIDENTIAL = 'Residential',
    COMMERCIAL = 'Commercial',
    MIXED = 'Mixed',
    INDUSTRIAL = 'Industrial',
    RETAIL = 'Retail',
}

export class CreatePropertyDto {
    @ApiProperty({ example: 'Sunset Apartments' })
    @IsString()
    name: string;

    @ApiProperty({ example: '123 Main Street' })
    @IsString()
    address: string;

    @ApiProperty({ example: 'Demo City' })
    @IsString()
    city: string;

    @ApiProperty({ example: 'California' })
    @IsString()
    state: string;

    @ApiProperty({ example: '90210' })
    @IsString()
    zipCode: string;

    @ApiProperty({ enum: PropertyType, example: PropertyType.RESIDENTIAL })
    @IsEnum(PropertyType)
    propertyType: PropertyType;

    @ApiProperty({ example: 24 })
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    totalUnits: number;

    @ApiProperty({ example: 2020, required: false })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1800)
    yearBuilt?: number;

    @ApiProperty({ example: 25000, required: false })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    squareFeet?: number;

    @ApiProperty({ example: 'Modern apartment complex with amenities', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'entity-id-123' })
    @IsString()
    entityId: string;
}