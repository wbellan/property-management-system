// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    organizationId: string;
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: any) {
        console.log('JWT Strategy - Raw payload:', payload);

        // JWT standard uses 'sub' (subject) for user ID, but handle both for compatibility
        const userId = payload.sub || payload.userId || payload.id;

        if (!userId) {
            console.error('JWT Strategy - No user ID in payload. Payload keys:', Object.keys(payload));
            throw new UnauthorizedException('Invalid token payload - missing user identifier');
        }

        console.log('JWT Strategy - Extracted userId:', userId);

        // Load full user data with relationships
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                userEntities: {
                    include: {
                        entity: true,
                    },
                },
                userProperties: {
                    include: {
                        property: true,
                    },
                },
            }
        });

        if (!user) {
            console.error('JWT Strategy - User not found:', userId);
            throw new UnauthorizedException('User not found');
        }

        if (user.status !== 'ACTIVE') {
            console.error('JWT Strategy - User not active:', userId);
            throw new UnauthorizedException('User account is not active');
        }

        // Update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // IMPORTANT: Return consistent field names that match frontend expectations
        const userPayload = {
            userId: user.id,  // Frontend expects userId, not id
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organizationId: user.organizationId,
            organization: user.organization,
            entities: user.userEntities.map(ue => ue.entity),
            properties: user.userProperties.map(up => up.property),
            status: user.status
        };

        console.log('JWT Strategy - Returning user payload:', {
            userId: userPayload.userId,
            email: userPayload.email,
            role: userPayload.role,
            organizationId: userPayload.organizationId,
            entitiesCount: userPayload.entities.length,
            propertiesCount: userPayload.properties.length
        });

        return userPayload;
    }
}