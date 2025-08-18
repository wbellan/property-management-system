// src/auth/auth.service.ts
import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async register(registerDto: RegisterDto) {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Verify organization exists
        const organization = await this.prisma.organization.findUnique({
            where: { id: registerDto.organizationId },
        });

        if (!organization) {
            throw new BadRequestException('Invalid organization');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(registerDto.password, 12);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                passwordHash: hashedPassword,
                firstName: registerDto.firstName,
                lastName: registerDto.lastName,
                phone: registerDto.phone,
                role: registerDto.role,
                organizationId: registerDto.organizationId,
                status: 'PENDING', // Admin needs to activate
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return {
            message: 'User registered successfully. Waiting for admin approval.',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                status: user.status,
                organization: user.organization,
            },
        };
    }

    async login(loginDto: LoginDto) {
        // Find user
        const user = await this.prisma.user.findUnique({
            where: { email: loginDto.email },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is active
        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedException('Account is not active. Please contact your administrator.');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate JWT token
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
        };

        const accessToken = this.jwtService.sign(payload);

        // Update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                organization: user.organization,
            },
        };
    }

    async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
        // Get user
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(
            changePasswordDto.currentPassword,
            user.passwordHash,
        );

        if (!isCurrentPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 12);

        // Update password
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: hashedNewPassword },
        });

        return { message: 'Password changed successfully' };
    }

    async getUserProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                userEntities: {
                    include: {
                        entity: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                userProperties: {
                    include: {
                        property: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Remove sensitive data
        const { passwordHash, ...userProfile } = user;

        return {
            ...userProfile,
            entities: user.userEntities.map(ue => ue.entity),
            properties: user.userProperties.map(up => up.property),
        };
    }

    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (user && (await bcrypt.compare(password, user.passwordHash))) {
            const { passwordHash, ...result } = user;
            return result;
        }
        return null;
    }

    // Admin functions
    async activateUser(userId: string) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { status: 'ACTIVE' },
        });

        return { message: 'User activated successfully', user };
    }

    async deactivateUser(userId: string) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { status: 'INACTIVE' },
        });

        return { message: 'User deactivated successfully', user };
    }
}