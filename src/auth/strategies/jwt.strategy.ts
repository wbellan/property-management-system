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

    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: {
                organization: true,
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
            },
        });

        if (!user || user.status !== 'ACTIVE') {
            throw new UnauthorizedException('User not found or inactive');
        }

        // Update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        return {
            userId: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            firstName: user.firstName,
            lastName: user.lastName,
            organization: user.organization,
            entities: user.userEntities.map(ue => ue.entity),
            properties: user.userProperties.map(up => up.property),
        };
    }
}