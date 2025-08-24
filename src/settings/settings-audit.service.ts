// src/settings/settings-audit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsAuditService {
    constructor(private prisma: PrismaService) { }

    async logSettingChange(
        userId: string,
        targetType: string,
        targetId: string,
        settingKey: string,
        oldValue: string | null,
        newValue: string,
        ipAddress?: string,
        userAgent?: string
    ) {
        return this.prisma.settingsAudit.create({
            data: {
                userId,
                targetType,
                targetId,
                settingKey,
                oldValue,
                newValue,
                action: oldValue ? 'UPDATE' : 'CREATE',
                ipAddress,
                userAgent
            }
        });
    }

    async logProfileChange(
        userId: string,
        changes: any,
        ipAddress?: string,
        userAgent?: string
    ) {
        const entries = Object.keys(changes).map(key => ({
            userId,
            targetType: 'USER',
            targetId: userId,
            settingKey: `profile_${key}`,
            oldValue: null, // Would need to fetch old values
            newValue: String(changes[key]),
            action: 'UPDATE',
            ipAddress,
            userAgent
        }));

        return this.prisma.settingsAudit.createMany({ data: entries });
    }

    async logPasswordChange(userId: string, ipAddress?: string, userAgent?: string) {
        return this.prisma.settingsAudit.create({
            data: {
                userId,
                targetType: 'USER',
                targetId: userId,
                settingKey: 'password_change',
                oldValue: null,
                newValue: 'password_changed',
                action: 'UPDATE',
                ipAddress,
                userAgent
            }
        });
    }

    async getAuditTrail(organizationId: string, page: number = 1, limit: number = 50) {
        return this.prisma.settingsAudit.findMany({
            where: {
                user: { organizationId }
            },
            include: {
                user: {
                    select: { firstName: true, lastName: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit
        });
    }
}
