import { Controller, Get, Put, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import { SettingsAuditService } from './settings-audit.service';
import { AuthService } from '../auth/auth.service'; // Import existing auth service

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
    constructor(
        private settingsService: SettingsService,
        private auditService: SettingsAuditService,
        private authService: AuthService // Use existing auth service
    ) { }

    // ============= USER SETTINGS =============
    @Get('preferences')
    @ApiOperation({ summary: 'Get user preferences' })
    async getUserSettings(@CurrentUser() user: any) {
        return this.settingsService.getUserSettings(user.userId);
    }

    @Put('preferences/:category/:key')
    @ApiOperation({ summary: 'Update user setting' })
    async updateUserSetting(
        @CurrentUser() user: any,
        @Param('category') category: string,
        @Param('key') key: string,
        @Body() { value }: { value: string },
        @Req() request: any
    ) {
        const result = await this.settingsService.updateUserSetting(
            user.userId,
            `${category}_${key}`,
            value,
            category
        );

        // Audit trail
        await this.auditService.logSettingChange(
            user.userId,
            'USER',
            user.userId,
            `${category}_${key}`,
            result.oldValue,
            value,
            request.ip,
            request.headers['user-agent']
        );

        return { success: true, data: result };
    }

    // ============= ORGANIZATION SETTINGS =============
    @Get('organization')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ORG_ADMIN, UserRole.ENTITY_MANAGER)
    @ApiOperation({ summary: 'Get organization settings' })
    async getOrganizationSettings(@CurrentUser() user: any) {
        return this.settingsService.getOrganizationSettings(user.organizationId, user.role);
    }

    @Put('organization/:category/:key')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Update organization setting' })
    async updateOrganizationSetting(
        @CurrentUser() user: any,
        @Param('category') category: string,
        @Param('key') key: string,
        @Body() { value }: { value: string },
        @Req() request: any
    ) {
        const result = await this.settingsService.updateOrganizationSetting(
            user.organizationId,
            `${category}_${key}`,
            value,
            category
        );

        // Audit trail
        await this.auditService.logSettingChange(
            user.userId,
            'ORGANIZATION',
            user.organizationId,
            `${category}_${key}`,
            result.oldValue,
            value,
            request.ip,
            request.headers['user-agent']
        );

        return { success: true, data: result };
    }

    // ============= PASSWORD CHANGE - USE AUTH SERVICE =============
    @Put('change-password')
    @ApiOperation({ summary: 'Change user password' })
    async changePassword(
        @CurrentUser() user: any,
        @Body() { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
        @Req() request: any
    ) {
        // Use existing auth service method instead of duplicating logic
        const result = await this.authService.changePassword(
            user.userId,
            currentPassword,
            newPassword
        );

        // Audit trail
        await this.auditService.logPasswordChange(
            user.userId,
            request.ip,
            request.headers['user-agent']
        );

        return { success: true, message: 'Password changed successfully' };
    }
}