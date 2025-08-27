import { IsString, IsOptional, IsBoolean, IsEmail, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEntityDto {
    @IsString()
    name: string;

    @IsString()
    legalName: string;

    @IsString()
    entityType: string;

    @IsString()
    organizationId: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @Transform(({ value }) => value && value.trim() !== '' ? value : undefined)
    @IsEmail({}, { message: 'Email must be a valid email address' })
    email?: string;

    @IsOptional()
    @IsString()
    fax?: string;

    @IsOptional()
    @Transform(({ value }) => value && value.trim() !== '' ? value : undefined)
    @IsUrl({}, { message: 'Website must be a valid URL' })
    website?: string;

    @IsOptional()
    @IsString()
    taxId?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}