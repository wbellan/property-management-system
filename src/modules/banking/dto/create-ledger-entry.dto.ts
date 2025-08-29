import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString } from "class-validator";

export enum EntryType {
    MANUAL = 'MANUAL',
    AUTOMATIC = 'AUTOMATIC',
    PAYMENT = 'PAYMENT',
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',
    TRANSFER = 'TRANSFER',
    RECONCILIATION = 'RECONCILIATION',
}

export class CreateLedgerEntryDto {
    @ApiProperty({ description: 'Bank ledger ID' })
    @IsString()
    @IsNotEmpty()
    bankLedgerId: string;

    @ApiProperty({ description: 'Chart account ID' })
    @IsString()
    @IsNotEmpty()
    chartAccountId: string;

    @ApiProperty({ enum: EntryType, description: 'Type of entry' })
    @IsEnum(EntryType)
    entryType: EntryType;

    @ApiProperty({ description: 'Transaction description' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: 'Debit amount (positive for debits)' })
    @IsNumberString()
    debitAmount: string;

    @ApiProperty({ description: 'Credit amount (positive for credits)' })
    @IsNumberString()
    creditAmount: string;

    @ApiProperty({ description: 'Transaction date (ISO string)' })
    @IsString()
    @IsNotEmpty()
    transactionDate: string;

    @ApiPropertyOptional({ description: 'Reference ID (invoice, payment, etc.)' })
    @IsString()
    @IsOptional()
    referenceId?: string;

    @ApiPropertyOptional({ description: 'Reference number (check number, etc.)' })
    @IsString()
    @IsOptional()
    referenceNumber?: string;
}

export class CreateMultipleLedgerEntriesDto {
    @ApiProperty({ type: [CreateLedgerEntryDto], description: 'Array of ledger entries' })
    entries: CreateLedgerEntryDto[];

    @ApiProperty({ description: 'Description for the entire transaction' })
    @IsString()
    @IsNotEmpty()
    transactionDescription: string;
}