// src/profile/profile.module.ts
import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SettingsAuditService } from '../settings/settings-audit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
    imports: [
        PrismaModule,
        MulterModule.register({
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB limit
                files: 1, // Only allow 1 file
            },
            fileFilter: (req, file, cb) => {
                if (file.mimetype.startsWith('image/')) {
                    cb(null, true);
                } else {
                    cb(new Error('Only image files are allowed'), false);
                }
            },
        }),
    ],
    controllers: [ProfileController],
    providers: [ProfileService, SettingsAuditService],
    exports: [ProfileService]
})
export class ProfileModule { }