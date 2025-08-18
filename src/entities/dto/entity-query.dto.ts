// src/entities/dto/entity-query.dto.ts
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EntityQueryDto {
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

    @ApiProperty({ required: false, example: 'LLC' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ required: false, example: 'LLC' })
    @IsOptional()
    @IsString()
    entityType?: string;
}
