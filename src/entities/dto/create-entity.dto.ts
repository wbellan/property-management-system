// src/entities/dto/create-entity.dto.ts
import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEntityDto {
    @ApiProperty({ example: 'Main Street Properties LLC' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'Main Street Properties Limited Liability Company', required: false })
    @IsOptional()
    @IsString()
    legalName?: string;

    @ApiProperty({ example: 'LLC', required: false })
    @IsOptional()
    @IsString()
    entityType?: string;

    @ApiProperty({ example: '12-3456789', required: false })
    @IsOptional()
    @IsString()
    taxId?: string;

    @ApiProperty({ example: '456 Business Ave, City, State 12345', required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ example: 'contact@mainstreetproperties.com', required: false })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ example: 'org-id-123' })
    @IsString()
    organizationId: string;
}