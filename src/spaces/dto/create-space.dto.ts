// // src/spaces/dto/create-space.dto.ts
// Align with Prisma enums and field names
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { SpaceType, SpaceStatus } from '@prisma/client';

export class CreateSpaceDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ApiProperty({ enum: SpaceType, default: SpaceType.UNIT })
    @IsEnum(SpaceType)
    type!: SpaceType;

    @ApiProperty({ enum: SpaceStatus, required: false, default: SpaceStatus.AVAILABLE })
    @IsOptional()
    @IsEnum(SpaceStatus)
    status?: SpaceStatus;

    @ApiProperty({ required: false, example: 1200 })
    @IsOptional()
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    squareFootage?: number; // NOTE: matches schema (not "squareFeet")

    @ApiProperty({ required: false, example: 2 })
    @IsOptional()
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    bedrooms?: number;

    @ApiProperty({ required: false, example: 1.5 })
    @IsOptional()
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    bathrooms?: number;

    @ApiProperty({ required: false, example: 1800.0 })
    @IsOptional()
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    rent?: number;

    @ApiProperty({ required: false, example: 500.0 })
    @IsOptional()
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    deposit?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ required: false, description: 'JSON string of amenities' })
    @IsOptional()
    @IsString()
    amenities?: string;

    @ApiProperty({ required: false, example: 2 })
    @IsOptional()
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    floorNumber?: number;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    propertyId!: string;
}

// import { IsString, IsInt, IsOptional, Min, IsEnum, IsNumber } from 'class-validator';
// import { Transform } from 'class-transformer';
// import { ApiProperty } from '@nestjs/swagger';

// export enum SpaceType {
//     APARTMENT = 'Apartment',
//     OFFICE = 'Office',
//     RETAIL = 'Retail',
//     STORAGE = 'Storage',
//     WAREHOUSE = 'Warehouse',
//     STUDIO = 'Studio',
//     LOFT = 'Loft',
//     TOWNHOUSE = 'Townhouse',
// }

// export class CreateSpaceDto {
//     @ApiProperty({ example: 'A101' })
//     @IsString()
//     name: string;

//     @ApiProperty({ example: 1, required: false })
//     @IsOptional()
//     @Transform(({ value }) => parseInt(value))
//     @IsInt()
//     @Min(1)
//     floor?: number;

//     @ApiProperty({ enum: SpaceType, example: SpaceType.APARTMENT })
//     @IsEnum(SpaceType)
//     spaceType: SpaceType;

//     @ApiProperty({ example: 2, required: false })
//     @IsOptional()
//     @Transform(({ value }) => parseInt(value))
//     @IsInt()
//     @Min(0)
//     bedrooms?: number;

//     @ApiProperty({ example: 1.5, required: false })
//     @IsOptional()
//     @Transform(({ value }) => parseFloat(value))
//     @IsNumber()
//     @Min(0)
//     bathrooms?: number;

//     @ApiProperty({ example: 1200, required: false })
//     @IsOptional()
//     @Transform(({ value }) => parseInt(value))
//     @IsInt()
//     @Min(1)
//     squareFeet?: number;

//     @ApiProperty({ example: 'Spacious 2-bedroom apartment with balcony', required: false })
//     @IsOptional()
//     @IsString()
//     description?: string;

//     @ApiProperty({ example: 'property-id-123' })
//     @IsString()
//     propertyId: string;
// }