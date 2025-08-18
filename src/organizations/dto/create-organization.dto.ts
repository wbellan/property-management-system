// src/organizations/dto/create-organization.dto.ts
import { IsString, IsOptional, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
    @ApiProperty({ example: 'ABC Property Management' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'Full-service property management company', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: '123 Main St, City, State 12345', required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ example: 'contact@abcproperties.com', required: false })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ example: 'https://www.abcproperties.com', required: false })
    @IsOptional()
    @IsUrl()
    website?: string;

    @ApiProperty({ example: 'https://logo.example.com/logo.png', required: false })
    @IsOptional()
    @IsUrl()
    logoUrl?: string;
}