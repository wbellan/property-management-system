// src/financials/dto/update-bank-ledger.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBankLedgerDto } from './create-bank-ledger.dto';

export class UpdateBankLedgerDto extends PartialType(
    OmitType(CreateBankLedgerDto, ['entityId'] as const),
) { }