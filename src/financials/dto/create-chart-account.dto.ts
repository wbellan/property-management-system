// src/financials/dto/create-chart-account.dto.ts
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AccountType {
    ASSET = 'Asset',
    LIABILITY = 'Liability',
    EQUITY = 'Equity',
    REVENUE = 'Revenue',
    EXPENSE = 'Expense',
}

export class CreateChartAccountDto {
    @ApiProperty({ example: '1000' })
    @IsString()
    accountCode: string;

    @ApiProperty({ example: 'Cash - Operating' })
    @IsString()
    accountName: string;

    @ApiProperty({ enum: AccountType, example: AccountType.ASSET })
    @IsEnum(AccountType)
    accountType: AccountType;

    @ApiProperty({ example: 'Primary operating cash account', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'entity-id-123' })
    @IsString()
    entityId: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;
}