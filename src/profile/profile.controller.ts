// src/profile/profile.controller.ts
import { Body, Controller, Delete, Get, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { SettingsAuditService } from "src/settings/settings-audit.service";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { ProfileService } from "./profile.service";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
    constructor(
        private profileService: ProfileService,
        private auditService: SettingsAuditService
    ) { }

    @Get()
    async getProfile(@CurrentUser() user: any) {
        return this.profileService.getProfile(user.userId);
    }

    @Put()
    async updateProfile(
        @CurrentUser() user: any,
        @Body() profileData: UpdateProfileDto,
        @Req() request: any
    ) {
        const result = await this.profileService.updateProfile(user.userId, profileData);

        // Audit trail for profile changes
        await this.auditService.logProfileChange(
            user.userId,
            profileData,
            request.ip,
            request.headers['user-agent']
        );

        return result;
    }

    @Post('photo')
    @UseInterceptors(FileInterceptor('photo'))
    async uploadProfilePhoto(
        @CurrentUser() user: any,
        @UploadedFile() file: any
    ) {
        return this.profileService.uploadProfilePhoto(user.userId, file);
    }

    @Delete('photo')
    async removeProfilePhoto(@CurrentUser() user: any) {
        return this.profileService.removeProfilePhoto(user.userId);
    }
}