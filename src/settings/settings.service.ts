// src/settings/settings.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async getUserProfile(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                title: true,
                department: true,
                bio: true,
                profilePhotoUrl: true,
                phoneWork: true,
                phoneEmergency: true,
                address: true,
                dateOfBirth: true,
                emergencyContactName: true,
                emergencyContactPhone: true,
                startDate: true,
                role: true,
                status: true,
                createdAt: true,
                lastLoginAt: true
            }
        });
    }

    async updateUserProfile(userId: string, profileData: any) {
        return this.prisma.user.update({
            where: { id: userId },
            data: profileData
        });
    }

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

    async changePassword(userId: string, currentPassword: string, newPassword: string, organizationId: string) {
        // Implementation for password change with validation
        // This would include bcrypt comparison and hashing
        const bcrypt = await import('bcrypt');

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

        if (!isValid) {
            throw new Error('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Add to password history
        await this.prisma.passwordHistory.create({
            data: { userId, passwordHash: user.passwordHash }
        });

        return this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword }
        });
    }
}
