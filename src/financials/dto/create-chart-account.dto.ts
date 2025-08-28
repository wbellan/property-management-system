// src/financials/dto/create-chart-account.dto.ts
import { IsString, IsOptional, IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';

// export enum AccountType {
//     ASSET = 'Asset',
//     LIABILITY = 'Liability',
//     EQUITY = 'Equity',
//     REVENUE = 'Revenue',
//     EXPENSE = 'Expense',
// }

export class CreateChartAccountDto {
    @IsString()
    @IsNotEmpty()
    entityId: string;

    @IsString()
    @IsNotEmpty()
    accountCode: string;

    @IsString()
    @IsNotEmpty()
    accountName: string;

    @IsEnum(AccountType)
    accountType: AccountType;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}