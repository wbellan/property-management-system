// src/modules/banking/dto/create-chart-account.dto.ts  
import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Use a custom enum to avoid conflicts with Prisma's AccountType
export enum ChartAccountType {
    ASSET = 'ASSET',
    LIABILITY = 'LIABILITY',
    EQUITY = 'EQUITY',
    REVENUE = 'REVENUE',
    EXPENSE = 'EXPENSE',
}

export class CreateChartAccountDto {
    @ApiProperty({ description: 'Unique account code (e.g., 1000, 2000)' })
    @IsString()
    @IsNotEmpty()
    accountCode: string;

    @ApiProperty({ description: 'Account name (e.g., Cash, Accounts Receivable)' })
    @IsString()
    @IsNotEmpty()
    accountName: string;

    @ApiProperty({ enum: ChartAccountType, description: 'Type of account' })
    @IsEnum(ChartAccountType)
    accountType: ChartAccountType;

    @ApiPropertyOptional({ description: 'Parent account ID for sub-accounts' })
    @IsString()
    @IsOptional()
    parentId?: string;

    @ApiPropertyOptional({ description: 'Account description' })
    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateChartAccountDto {
    @ApiPropertyOptional({ description: 'Account code' })
    @IsString()
    @IsOptional()
    accountCode?: string;

    @ApiPropertyOptional({ description: 'Account name' })
    @IsString()
    @IsOptional()
    accountName?: string;

    @ApiPropertyOptional({ description: 'Account type' })
    @IsEnum(ChartAccountType)
    @IsOptional()
    accountType: ChartAccountType;

    @ApiPropertyOptional({ description: 'Account description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Account parent ID.' })
    @IsString()
    @IsOptional()
    parentId?: string;

//     @ApiPropertyOptional({ description: 'Whether the account is active' })
//     @IsOptional()
//     isActive?: boolean;
}