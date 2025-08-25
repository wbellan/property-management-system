// src/spaces/dto/space-query.dto.ts
import { IsOptional, IsString, IsInt, Min, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SpaceType } from '@prisma/client';

export class SpaceQueryDto {
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

    @ApiProperty({ required: false, example: 'A101' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ enum: SpaceType, required: false })
    @IsOptional()
    @IsEnum(SpaceType)
    spaceType?: SpaceType;

    @ApiProperty({ required: false, example: 2 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(0)
    bedrooms?: number;

    @ApiProperty({ required: false, example: 1 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    floor?: number;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    available?: boolean;

    @ApiProperty({ required: false, example: 'property-id-123' })
    @IsOptional()
    @IsString()
    propertyId?: string;
}