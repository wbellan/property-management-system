// src/maintenance/dto/update-vendor.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateVendorDto } from './create-vendor.dto';

export class UpdateVendorDto extends PartialType(
    OmitType(CreateVendorDto, ['entityId'] as const),
) { }