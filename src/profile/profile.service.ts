// src/profile/profile.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProfileService {
    constructor(private prisma: PrismaService) { }

    async getProfile(userId: string) {
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
                lastLoginAt: true,
                organization: {
                    select: { name: true }
                }
            }
        });
    }

    async updateProfile(userId: string, profileData: any) {
        return this.prisma.user.update({
            where: { id: userId },
            data: profileData
        });
    }

    async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file provided');

        // With diskStorage, Multer already wrote the file.
        // file.path is absolute; file.filename is the basename we set in Multer config.
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');

        // Ensure the dir exists (safe no-op if already exists)
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // If you set the filename in Multer using `${userId}_${Date.now()}${ext}`,
        // you can trust file.filename here.
        const finalFileName = file.filename || path.basename(file.path);
        const photoUrl = `/uploads/profiles/${finalFileName}`;

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { profilePhotoUrl: photoUrl },
        });

        return {
            profilePhotoUrl: updatedUser.profilePhotoUrl,
            message: 'Photo uploaded successfully',
        };
    }

    async removeProfilePhoto(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        // Remove file from disk if it exists
        if (user?.profilePhotoUrl) {
            const filePath = path.join(process.cwd(), 'public', user.profilePhotoUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { profilePhotoUrl: null }
        });

        return {
            profilePhotoUrl: null,
            message: 'Photo removed successfully'
        };
    }
}