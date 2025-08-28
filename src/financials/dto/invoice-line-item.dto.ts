// File: src/financials/dto/invoice-line-item.dto.ts

import { IsString, IsNumber, IsOptional, IsDateString, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceLineItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @IsString()
  chartAccountId?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateInvoiceLineItemDto extends CreateInvoiceLineItemDto {
    @IsOptional()
    @IsString()
    id?: string;
}