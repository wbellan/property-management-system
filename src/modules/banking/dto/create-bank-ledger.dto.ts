import { IsString, IsOptional, IsEnum, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BankAccountType } from '@prisma/client';

export class CreateBankLedgerDto {
    @ApiProperty({ description: 'Name of the bank account' })
    @IsString()
    @IsNotEmpty()
    accountName: string;

    @ApiPropertyOptional({ description: 'Bank account number (masked for security)' })
    @IsString()
    @IsOptional()
    accountNumber?: string;

    @ApiPropertyOptional({ description: 'Name of the bank' })
    @IsString()
    @IsOptional()
    bankName?: string;

    @ApiProperty({ enum: BankAccountType, description: 'Type of bank account' })
    @IsEnum(BankAccountType)
    accountType: BankAccountType;

    @ApiPropertyOptional({ description: 'Bank routing number' })
    @IsString()
    @IsOptional()
    @Length(9, 9)
    routingNumber?: string;

    @ApiPropertyOptional({ description: 'Additional notes about the account' })
    @IsString()
    @IsOptional()
    notes?: string;

    // NEW: Optional chart account ID (if not specified, will be auto-created)
    @IsString()
    @IsOptional()
    chartAccountId?: string;
}

export class UpdateBankLedgerDto {
    @ApiPropertyOptional({ description: 'Name of the bank account' })
    @IsString()
    @IsOptional()
    accountName?: string;

    @ApiPropertyOptional({ description: 'Bank account number (masked for security)' })
    @IsString()
    @IsOptional()
    accountNumber?: string;

    @ApiPropertyOptional({ description: 'Name of the bank' })
    @IsString()
    @IsOptional()
    bankName?: string;

    @ApiPropertyOptional({ enum: BankAccountType, description: 'Type of bank account' })
    @IsEnum(BankAccountType)
    @IsOptional()
    accountType?: BankAccountType;

    @ApiPropertyOptional({ description: 'Bank routing number' })
    @IsString()
    @IsOptional()
    @Length(9, 9)
    routingNumber?: string;

    @ApiPropertyOptional({ description: 'Additional notes about the account' })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional({ description: 'Whether the account is active' })
    @IsOptional()
    isActive?: boolean;
}
