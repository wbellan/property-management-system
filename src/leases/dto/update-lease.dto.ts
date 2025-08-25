// src/leases/dto/update-lease.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateLeaseDto } from './create-lease.dto';

export class UpdateLeaseDto extends PartialType(CreateLeaseDto) { }

// import { PartialType, OmitType } from '@nestjs/swagger';
// import { CreateLeaseDto } from './create-lease.dto';

// export class UpdateLeaseDto extends PartialType(
//     OmitType(CreateLeaseDto, ['spaceId', 'tenantId'] as const),
// ) { }