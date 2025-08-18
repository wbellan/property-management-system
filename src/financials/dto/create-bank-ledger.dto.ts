// src/financials/dto/create-bank-ledger.dto.ts
import { IsString, IsOptional, IsDecimal, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum BankAccountType {
    CHECKING = 'Checking',
    SAVINGS = 'Savings',
    MONEY_MARKET = 'Money Market',
    BUSINESS_CHECKING = 'Business Checking',
}

export class CreateBankLedgerDto {
    @ApiProperty({ example: 'Operating Account' })
    @IsString()
    accountName: string;

    @ApiProperty({ example: '****1234', required: false })
    @IsOptional()
    @IsString()
    accountNumber?: string;

    @ApiProperty({ example: 'First National Bank', required: false })
    @IsOptional()
    @IsString()
    bankName?: string;

    @ApiProperty({ enum: BankAccountType, example: BankAccountType.CHECKING })
    @IsEnum(BankAccountType)
    accountType: BankAccountType;

    @ApiProperty({ example: 10000.00 })
    @Transform(({ value }) => parseFloat(value))
    @IsDecimal({ decimal_digits: '0,2' })
    currentBalance: number;

    @ApiProperty({ example: 'entity-id-123' })
    @IsString()
    entityId: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;
}
