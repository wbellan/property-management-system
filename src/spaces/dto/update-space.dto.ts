// src/spaces/dto/update-space.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSpaceDto } from './create-space.dto';

export class UpdateSpaceDto extends PartialType(
    OmitType(CreateSpaceDto, ['propertyId'] as const),
) { }