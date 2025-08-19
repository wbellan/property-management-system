// src/maintenance/dto/create-vendor.dto.ts
import { IsString, IsOptional, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum VendorType {
    HVAC = 'HVAC',
    PLUMBING = 'Plumbing',
    ELECTRICAL = 'Electrical',
    GENERAL_CONTRACTOR = 'General Contractor',
    LANDSCAPING = 'Landscaping',
    CLEANING = 'Cleaning',
    APPLIANCE_REPAIR = 'Appliance Repair',
    PEST_CONTROL = 'Pest Control',
    SECURITY = 'Security',
    OTHER = 'Other',
}

export class CreateVendorDto {
    @ApiProperty({ example: 'ABC HVAC Services' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'Professional HVAC repair and maintenance', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: VendorType, example: VendorType.HVAC })
    @IsEnum(VendorType)
    vendorType: VendorType;

    @ApiProperty({ example: 'John Smith', required: false })
    @IsOptional()
    @IsString()
    contactName?: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ example: 'service@abchvac.com', required: false })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ example: '456 Service St, City, State 12345', required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: 'LIC-12345', required: false })
    @IsOptional()
    @IsString()
    licenseNumber?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    isInsured?: boolean = false;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;

    @ApiProperty({ example: 'entity-id-123' })
    @IsString()
    entityId: string;
}