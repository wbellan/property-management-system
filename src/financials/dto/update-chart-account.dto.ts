// src/financials/dto/update-chart-account.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateChartAccountDto } from './create-chart-account.dto';

export class UpdateChartAccountDto extends PartialType(
    OmitType(CreateChartAccountDto, ['entityId'] as const),
) { }