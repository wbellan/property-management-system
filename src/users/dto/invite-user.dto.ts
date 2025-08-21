// src/users/dto/invite-user.dto.ts
import { IsString, IsEmail, IsEnum, IsArray, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    lastName: string;

    @ApiProperty({ enum: UserRole, example: UserRole.PROPERTY_MANAGER })
    @IsEnum(UserRole)
    role: UserRole;

    @ApiProperty({ type: [String], required: false, description: 'Entity IDs for access' })
    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    entityIds?: string[];

    @ApiProperty({ type: [String], required: false, description: 'Property IDs for access' })
    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    propertyIds?: string[];
}