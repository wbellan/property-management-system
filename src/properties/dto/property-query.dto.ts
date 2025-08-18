// src/properties/dto/property-query.dto.ts
import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PropertyType } from './create-property.dto';

export class PropertyQueryDto {
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

    @ApiProperty({ required: false, example: 'Sunset' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ enum: PropertyType, required: false })
    @IsOptional()
    @IsEnum(PropertyType)
    propertyType?: PropertyType;

    @ApiProperty({ required: false, example: 'Demo City' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiProperty({ required: false, example: 'California' })
    @IsOptional()
    @IsString()
    state?: string;

    @ApiProperty({ required: false, example: 'entity-id-123' })
    @IsOptional()
    @IsString()
    entityId?: string;
}
