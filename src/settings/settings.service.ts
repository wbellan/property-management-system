// src/settings/settings.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    // ============= USER SETTINGS METHODS =============
    async getUserSettings(userId: string) {
        const settings = await this.prisma.userSetting.findMany({
            where: { userId },
            orderBy: { category: 'asc' }
        });

        // Group by category
        return settings.reduce((acc, setting) => {
            if (!acc[setting.category]) {
                acc[setting.category] = {};
            }
            acc[setting.category][setting.settingKey] = setting.settingValue;
            return acc;
        }, {});
    }

    async updateUserSetting(userId: string, settingKey: string, value: string, category: string) {
        const existing = await this.prisma.userSetting.findUnique({
            where: { userId_settingKey: { userId, settingKey } }
        });

        const result = await this.prisma.userSetting.upsert({
            where: { userId_settingKey: { userId, settingKey } },
            update: { settingValue: value, updatedAt: new Date() },
            create: { userId, settingKey, settingValue: value, category }
        });

        return { ...result, oldValue: existing?.settingValue };
    }

    // ============= ORGANIZATION SETTINGS METHODS =============
    async getOrganizationSettings(organizationId: string, userRole: string) {
        const settings = await this.prisma.organizationSetting.findMany({
            where: { organizationId }
        });

        // Filter based on role - only return editable settings for non-admins
        if (!['ORG_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return settings.filter(s => s.isUserEditable);
        }

        return settings.reduce((acc, setting) => {
            if (!acc[setting.category]) {
                acc[setting.category] = {};
            }
            acc[setting.category][setting.settingKey] = {
                value: setting.settingValue,
                editable: setting.isUserEditable
            };
            return acc;
        }, {});
    }

    async updateOrganizationSetting(organizationId: string, settingKey: string, value: string, category: string) {
        const existing = await this.prisma.organizationSetting.findUnique({
            where: { organizationId_settingKey: { organizationId, settingKey } }
        });

        const result = await this.prisma.organizationSetting.upsert({
            where: { organizationId_settingKey: { organizationId, settingKey } },
            update: { settingValue: value, updatedAt: new Date() },
            create: { organizationId, settingKey, settingValue: value, category, isUserEditable: false }
        });

        return { ...result, oldValue: existing?.settingValue };
    }
}
