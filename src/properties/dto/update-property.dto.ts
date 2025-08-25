// src/properties/dto/update-property.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePropertyDto } from './create-property.dto';

// Keep all fields optional for updates; `entityId` stays optional here for re-assignment use-cases.
export class UpdatePropertyDto extends PartialType(CreatePropertyDto) { }

// import { PartialType, OmitType } from '@nestjs/swagger';
// import { CreatePropertyDto } from './create-property.dto';

// export class UpdatePropertyDto extends PartialType(
//     OmitType(CreatePropertyDto, ['entityId'] as const),
// ) { }
