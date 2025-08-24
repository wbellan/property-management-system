import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import { SettingsAuditService } from "./settings-audit.service";
import { SettingsService } from "./settings.service";

// src/settings/settings.controller.ts
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
    constructor(
        private settingsService: SettingsService,
        private auditService: SettingsAuditService
    ) { }

    @Get('profile')
    async getProfile(@CurrentUser() user: any) {
        return this.settingsService.getUserProfile(user.userId);
    }

    @Put('profile')
    async updateProfile(
        @CurrentUser() user: any,
        @Body() profileData: any,
        @Req() request: any
    ) {
        const result = await this.settingsService.updateUserProfile(user.userId, profileData);

        // Audit trail
        await this.auditService.logProfileChange(
            user.userId,
            profileData,
            request.ip,
            request.headers['user-agent']
        );

        return result;
    }

    @Post('change-password')
    async changePassword(
        @CurrentUser() user: any,
        @Body() { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
        @Req() request: any
    ) {
        const result = await this.settingsService.changePassword(
            user.userId,
            currentPassword,
            newPassword,
            user.organizationId
        );

        // Audit trail
        await this.auditService.logPasswordChange(
            user.userId,
            request.ip,
            request.headers['user-agent']
        );

        return result;
    }

    @Get('preferences')
    async getUserSettings(@CurrentUser() user: any) {
        return this.settingsService.getUserSettings(user.userId);
    }

    @Put('preferences/:category/:key')
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

        return result;
    }

    @Get('organization')
    @UseGuards(RolesGuard)
    @Roles('ORG_ADMIN', 'ENTITY_MANAGER')
    async getOrganizationSettings(@CurrentUser() user: any) {
        return this.settingsService.getOrganizationSettings(user.organizationId, user.role);
    }

    @Put('organization/:category/:key')
    @UseGuards(RolesGuard)
    @Roles('ORG_ADMIN', 'SUPER_ADMIN')
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

        return result;
    }

    @Get('audit')
    @UseGuards(RolesGuard)
    @Roles('ORG_ADMIN', 'SUPER_ADMIN')
    async getAuditTrail(
        @CurrentUser() user: any,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50
    ) {
        return this.auditService.getAuditTrail(user.organizationId, page, limit);
    }
}