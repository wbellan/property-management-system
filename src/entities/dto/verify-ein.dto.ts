// src/entities/dto/verify-ein.dto.ts
import { IsString, Matches } from 'class-validator';

export class VerifyEinDto {
    @IsString()
    @Matches(/^\d{2}-\d{7}$/, { message: 'EIN must be in format XX-XXXXXXX' })
    ein: string;
}