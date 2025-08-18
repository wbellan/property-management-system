// src/auth/dto/change-password.dto.ts
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty({ example: 'oldpassword123' })
    @IsString()
    currentPassword: string;

    @ApiProperty({ example: 'newpassword123' })
    @IsString()
    @MinLength(6)
    newPassword: string;
}