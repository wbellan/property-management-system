// src/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsAuditService } from './settings-audit.service';
import { DefaultSettingsService } from './default-settings.service';
import { PasswordValidatorService } from 'src/auth/password-validator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [
        PrismaModule,
        AuthModule
    ],
    controllers: [SettingsController],
    providers: [
        SettingsService,
        SettingsAuditService,
        DefaultSettingsService
    ],
    exports: [SettingsService, SettingsAuditService, DefaultSettingsService]
})
export class SettingsModule { }