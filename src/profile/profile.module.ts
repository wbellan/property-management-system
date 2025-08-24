// src/profile/profile.module.ts
import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SettingsAuditService } from '../settings/settings-audit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
    imports: [
        PrismaModule,
        MulterModule.register({
            storage: diskStorage({
                destination: './public/uploads/profiles',
                filename: (req, file, callback) => {
                    // const userId = req.user?.userId ?? 'unknown';
                    // Temp Start - Tounblock me now.
                    const u = req.user as { id?: string; userId?: string } | undefined;
                    const userId = u?.userId ?? u?.id ?? 'unknown';
                    // Temp End
                    const randomName = Date.now();
                    const ext = extname(file.originalname);
                    callback(null, `${userId}_${randomName}${ext}`);
                },
            }),
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
                files: 1,
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