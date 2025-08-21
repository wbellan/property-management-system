// src/users/dto/complete-invitation.dto.ts
import { IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteInvitationDto {
    @ApiProperty({ example: 'invitation-token-here' })
    @IsString()
    token: string;

    @ApiProperty({ example: 'SecurePassword123!' })
    @IsString()
    @MinLength(8)
    password: string;
}