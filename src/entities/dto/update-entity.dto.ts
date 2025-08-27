import { PartialType } from '@nestjs/swagger';
import { CreateEntityDto } from './create-entity.dto';
import { IsOptional, IsBoolean, IsString, IsEmail, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateEntityDto extends PartialType(CreateEntityDto) {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

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