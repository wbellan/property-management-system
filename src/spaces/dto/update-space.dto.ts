// src/spaces/dto/update-space.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSpaceDto } from './create-space.dto';

// Typically we don’t allow property reassignment in an update;
// if you do, remove the OmitType and just make everything partial.
export class UpdateSpaceDto extends PartialType(
    OmitType(CreateSpaceDto, ['propertyId'] as const),
) { }

// import { PartialType, OmitType } from '@nestjs/swagger';
// import { CreateSpaceDto } from './create-space.dto';

// export class UpdateSpaceDto extends PartialType(
//     OmitType(CreateSpaceDto, ['propertyId'] as const),
// ) { }