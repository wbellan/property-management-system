// src/users/dto/validate-invitation.dto.ts
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateInvitationDto {
    @ApiProperty({ example: 'invitation-token-here' })
    @IsString()
    token: string;
}