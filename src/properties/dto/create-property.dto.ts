// // src/properties/dto/create-property.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { PropertyType } from '@prisma/client';

// export enum PropertyType {
//     RESIDENTIAL = 'Residential',
//     COMMERCIAL = 'Commercial',
//     MIXED_USE = 'Mixed Use',
//     INDUSTRIAL = 'Industrial',
//     RETAIL = 'Retail',
//     OFFICE = 'Office',
//     WAREHOUSE = 'Warehouse',
//     LAND = 'Land'
// }

export class CreatePropertyDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    address!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    city!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    state!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    zipCode!: string;

    @ApiProperty({ enum: PropertyType, default: PropertyType.RESIDENTIAL })
    @IsEnum(PropertyType)
    propertyType!: PropertyType;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ required: false, example: 1 })
    @IsOptional()
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    totalSpaces?: number;

    @ApiProperty({ required: false, example: 500000.0 })
    @IsOptional()
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    purchasePrice?: number;

    @ApiProperty({ required: false, example: 525000.0 })
    @IsOptional()
    @Transform(({ value }) => (value !== null && value !== undefined ? Number(value) : value))
    @IsNumber()
    currentMarketValue?: number;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    entityId!: string;
}

// import { IsString, IsInt, IsOptional, Min, IsEnum } from 'class-validator';
// import { Transform } from 'class-transformer';
// import { ApiProperty } from '@nestjs/swagger';

// export enum PropertyType {
//     RESIDENTIAL = 'Residential',
//     COMMERCIAL = 'Commercial',
//     MIXED = 'Mixed',
//     INDUSTRIAL = 'Industrial',
//     RETAIL = 'Retail',
// }

// export class CreatePropertyDto {
//     @ApiProperty({ example: 'Sunset Apartments' })
//     @IsString()
//     name: string;

//     @ApiProperty({ example: '123 Main Street' })
//     @IsString()
//     address: string;

//     @ApiProperty({ example: 'Demo City' })
//     @IsString()
//     city: string;

//     @ApiProperty({ example: 'California' })
//     @IsString()
//     state: string;

//     @ApiProperty({ example: '90210' })
//     @IsString()
//     zipCode: string;

//     @ApiProperty({ enum: PropertyType, example: PropertyType.RESIDENTIAL })
//     @IsEnum(PropertyType)
//     propertyType: PropertyType;

//     @ApiProperty({ example: 24 })
//     @Transform(({ value }) => parseInt(value))
//     @IsInt()
//     @Min(1)
//     totalUnits: number;

//     @ApiProperty({ example: 2020, required: false })
//     @IsOptional()
//     @Transform(({ value }) => parseInt(value))
//     @IsInt()
//     @Min(1800)
//     yearBuilt?: number;

//     @ApiProperty({ example: 25000, required: false })
//     @IsOptional()
//     @Transform(({ value }) => parseInt(value))
//     @IsInt()
//     @Min(1)
//     squareFeet?: number;

//     @ApiProperty({ example: 'Modern apartment complex with amenities', required: false })
//     @IsOptional()
//     @IsString()
//     description?: string;

//     @ApiProperty({ example: 'entity-id-123' })
//     @IsString()
//     entityId: string;
// }