// src/auth/auth.controller.ts
import {
    Controller,
    Post,
    Body,
    UseGuards,
    Get,
    Patch,
    Param,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 409, description: 'User already exists' })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login user' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved' })
    async getProfile(@CurrentUser('userId') userId: string) {
        return this.authService.getUserProfile(userId);
    }

    @Patch('change-password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Change user password' })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    @ApiResponse({ status: 401, description: 'Current password is incorrect' })
    async changePassword(
        @CurrentUser('userId') userId: string,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        return this.authService.changePassword(userId, changePasswordDto);
    }

    // Admin endpoints
    @Patch('users/:userId/activate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Activate a user (Admin only)' })
    @ApiResponse({ status: 200, description: 'User activated successfully' })
    async activateUser(@Param('userId') userId: string) {
        return this.authService.activateUser(userId);
    }

    @Patch('users/:userId/deactivate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Deactivate a user (Admin only)' })
    @ApiResponse({ status: 200, description: 'User deactivated successfully' })
    async deactivateUser(@Param('userId') userId: string) {
        return this.authService.deactivateUser(userId);
    }
}