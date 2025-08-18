// src/entities/dto/update-entity.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEntityDto } from './create-entity.dto';

export class UpdateEntityDto extends PartialType(
  OmitType(CreateEntityDto, ['organizationId'] as const),
) {}