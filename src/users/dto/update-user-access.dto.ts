// src/users/dto/update-user-access.dto.ts
import { IsString, IsEnum, IsArray, IsOptional, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class UpdateUserAccessDto {
    @ApiProperty({ enum: UserRole, description: 'User role' })
    @IsEnum(UserRole)
    role: UserRole;

    @ApiProperty({ enum: UserStatus, description: 'User status' })
    @IsEnum(UserStatus)
    status: UserStatus;

    @ApiProperty({ type: [String], description: 'Array of entity IDs' })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    entityIds?: string[];

    @ApiProperty({ type: [String], description: 'Array of property IDs' })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    propertyIds?: string[];
}